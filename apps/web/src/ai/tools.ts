import { db } from "@/lib/db";
import type { ToolDefinition } from "@/lib/anthropic";

export interface ToolContext {
  userId: string;
}

export interface ToolSpec {
  definition: ToolDefinition;
  execute: (input: any, ctx: ToolContext) => Promise<string>;
}

const VALID_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

/**
 * Static tool registry — the real functions AI agents can call. Which of
 * these a given agent may use is controlled by its `tools` column
 * (see packages/database/seed.js and the admin agent editor).
 */
export const STATIC_TOOLS: Record<string, ToolSpec> = {
  get_business_metrics: {
    definition: {
      name: "get_business_metrics",
      description:
        "Fetch recent monthly business metrics (revenue, expenses, customers, tasksCompleted) as a time series. Use this before making any claim about business performance.",
      input_schema: {
        type: "object",
        properties: {
          metricKey: {
            type: "string",
            description:
              "One of: revenue, expenses, customers, tasksCompleted. Omit to fetch all metrics.",
          },
          months: {
            type: "number",
            description: "How many recent months per metric to include (default 6).",
          },
        },
      },
    },
    execute: async (input) => {
      const months = Math.min(Math.max(Number(input?.months) || 6, 1), 24);
      const rows = await db.businessMetric.findMany({
        where: input?.metricKey ? { metricKey: String(input.metricKey) } : undefined,
        orderBy: { periodDate: "desc" },
        take: months * 4,
      });
      if (rows.length === 0) return "No business metrics have been recorded yet.";
      const byMetric = new Map<string, typeof rows>();
      for (const row of rows) {
        const list = byMetric.get(row.metricKey) ?? [];
        list.push(row);
        byMetric.set(row.metricKey, list);
      }
      const series = Array.from(byMetric.entries()).map(([key, rowsForKey]) => ({
        metric: key,
        label: rowsForKey[0].label,
        points: rowsForKey
          .slice(0, months)
          .sort((a, b) => a.periodDate.getTime() - b.periodDate.getTime())
          .map((r) => ({ period: r.periodDate.toISOString().slice(0, 7), value: r.value })),
      }));
      return JSON.stringify(series);
    },
  },

  list_tasks: {
    definition: {
      name: "list_tasks",
      description:
        "List current tasks, optionally filtered by status or assigned agent. Use before recommending new priorities so you don't duplicate work already in progress.",
      input_schema: {
        type: "object",
        properties: {
          status: { type: "string", enum: VALID_STATUSES },
          assignedAgentSlug: { type: "string" },
          limit: { type: "number", description: "Max rows to return (default 10)." },
        },
      },
    },
    execute: async (input) => {
      const limit = Math.min(Math.max(Number(input?.limit) || 10, 1), 50);
      const where: Record<string, unknown> = {};
      if (input?.status && VALID_STATUSES.includes(input.status)) where.status = input.status;
      if (input?.assignedAgentSlug) {
        const agent = await db.agent.findUnique({ where: { slug: String(input.assignedAgentSlug) } });
        where.assignedAgentId = agent?.id ?? "__none__";
      }
      const tasks = await db.task.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        include: {
          assignedAgent: { select: { title: true } },
          assignedUser: { select: { name: true } },
        },
      });
      if (tasks.length === 0) return "No tasks match that filter.";
      return JSON.stringify(
        tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignedTo: t.assignedAgent?.title ?? t.assignedUser?.name ?? "unassigned",
          dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
        }))
      );
    },
  },

  create_task: {
    definition: {
      name: "create_task",
      description:
        "Create a new task in the task board, optionally assigned to a specific AI agent. Use this when you or the user identify concrete follow-up work.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          assignedAgentSlug: {
            type: "string",
            description: "Slug of the agent to assign this to, e.g. 'marketing-ai'. Omit to leave unassigned.",
          },
          priority: { type: "string", enum: VALID_PRIORITIES },
          dueDate: { type: "string", description: "ISO date (YYYY-MM-DD), optional." },
        },
        required: ["title", "description"],
      },
    },
    execute: async (input, ctx) => {
      if (!input?.title || !input?.description) {
        return "Tool error: title and description are required.";
      }
      let assignedAgentId: string | undefined;
      if (input.assignedAgentSlug) {
        const agent = await db.agent.findUnique({ where: { slug: String(input.assignedAgentSlug) } });
        if (agent) assignedAgentId = agent.id;
      }
      const priority = VALID_PRIORITIES.includes(input.priority) ? input.priority : "MEDIUM";
      const task = await db.task.create({
        data: {
          title: String(input.title).slice(0, 200),
          description: String(input.description).slice(0, 4000),
          priority,
          assignedAgentId,
          createdByUserId: ctx.userId,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        },
      });
      await db.activityLog.create({
        data: {
          userId: ctx.userId,
          action: "task.created_by_ai",
          entityType: "Task",
          entityId: task.id,
          metadata: { title: task.title },
        },
      });
      return `Task created: "${task.title}" (id: ${task.id}, status: TODO).`;
    },
  },

  search_knowledge_base: {
    definition: {
      name: "search_knowledge_base",
      description:
        "Search the company knowledge base (policies, product info, brand positioning) for entries relevant to a query. Use this before answering questions about internal company facts you're not certain of.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
    execute: async (input) => {
      const query = String(input?.query ?? "").trim();
      if (!query) return "No query provided.";
      const words = query
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 6);
      if (words.length === 0) return "Query too short to search.";
      const entries = await db.knowledgeBaseEntry.findMany({
        where: {
          OR: words.flatMap((w) => [
            { title: { contains: w, mode: "insensitive" as const } },
            { content: { contains: w, mode: "insensitive" as const } },
          ]),
        },
        take: 4,
      });
      if (entries.length === 0) return "No matching knowledge base entries found.";
      return JSON.stringify(
        entries.map((e) => ({ title: e.title, category: e.category, content: e.content }))
      );
    },
  },
};
