import { db } from "@/lib/db";
import { runWithTools, type ToolDefinition, type ToolCallRecord } from "@/lib/anthropic";
import { STATIC_TOOLS, type ToolContext } from "./tools";

interface RunAgentTurnOptions {
  agentSlug: string;
  userId: string;
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  /** false when a sub-agent is being called by the CEO's delegate tool, to prevent recursive delegation. */
  allowDelegation?: boolean;
  /** Forces the CEO agent to consult at least one specialist before answering (used by /api/ai/orchestrate). */
  forceDelegation?: boolean;
}

export interface RunAgentTurnResult {
  agent: { id: string; slug: string; title: string; roleType: string; color: string; avatarIcon: string };
  text: string;
  toolCalls: ToolCallRecord[];
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Runs one turn of a conversation with a given agent: builds its system
 * prompt (role identity + lightweight knowledge-base retrieval), wires up
 * only the tools that agent is allowed to use, and — for the CEO agent —
 * adds a "delegate_to_agent" tool so it can consult specialist agents and
 * synthesize their answers, matching the "CEO delegates to Finance +
 * Marketing → combined response" flow.
 */
export async function runAgentTurn({
  agentSlug,
  userId,
  message,
  history = [],
  allowDelegation = true,
  forceDelegation = false,
}: RunAgentTurnOptions): Promise<RunAgentTurnResult> {
  const agent = await db.agent.findUnique({ where: { slug: agentSlug } });
  if (!agent || !agent.isActive) {
    throw new Error(`Agent "${agentSlug}" not found or inactive`);
  }

  const allowedTools = new Set(agent.tools);
  const toolDefs: ToolDefinition[] = [];
  const executors: Record<string, (input: any, ctx: ToolContext) => Promise<string>> = {};

  for (const [name, spec] of Object.entries(STATIC_TOOLS)) {
    if (allowedTools.has(name)) {
      toolDefs.push(spec.definition);
      executors[name] = spec.execute;
    }
  }

  if (allowDelegation && agent.roleType === "CEO" && allowedTools.has("delegate_to_agent")) {
    const otherAgents = await db.agent.findMany({
      where: { isActive: true, id: { not: agent.id } },
      select: { slug: true, title: true },
      orderBy: { order: "asc" },
    });
    if (otherAgents.length > 0) {
      toolDefs.push({
        name: "delegate_to_agent",
        description: `Delegate a specific question to a specialist AI co-worker and get their expert, data-backed answer. Available agents: ${otherAgents
          .map((a) => `${a.slug} (${a.title})`)
          .join(", ")}.`,
        input_schema: {
          type: "object",
          properties: {
            agentSlug: { type: "string", enum: otherAgents.map((a) => a.slug) },
            question: { type: "string", description: "The specific question to ask this specialist." },
          },
          required: ["agentSlug", "question"],
        },
      });
      executors["delegate_to_agent"] = async (input) => {
        const sub = await runAgentTurn({
          agentSlug: input.agentSlug,
          userId,
          message: input.question,
          allowDelegation: false,
        });
        return `[${sub.agent.title} replied]: ${sub.text}`;
      };
    }
  }

  const kbContext = await buildKnowledgeContext(message);
  const system = `${agent.systemPrompt}

Tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.${kbContext}

Gunakan tool yang tersedia untuk mendapatkan data nyata sebelum membuat klaim faktual. Jangan pernah mengarang angka atau data perusahaan.`;

  const result = await runWithTools<ToolContext>({
    system,
    messages: [...history, { role: "user", content: message }],
    tools: toolDefs,
    executors,
    ctx: { userId },
    effort: agent.roleType === "CEO" ? "high" : "medium",
    maxTokens: 2048,
    forceToolUseOnFirstRound: forceDelegation && toolDefs.some((t) => t.name === "delegate_to_agent"),
  });

  return {
    agent: {
      id: agent.id,
      slug: agent.slug,
      title: agent.title,
      roleType: agent.roleType,
      color: agent.color,
      avatarIcon: agent.avatarIcon,
    },
    ...result,
  };
}

/** Cheap keyword-overlap retrieval — no vector DB, just ILIKE on title/content. */
async function buildKnowledgeContext(message: string): Promise<string> {
  const words = message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);
  if (words.length === 0) return "";

  const entries = await db.knowledgeBaseEntry.findMany({
    where: {
      OR: words.flatMap((w) => [
        { title: { contains: w, mode: "insensitive" as const } },
        { content: { contains: w, mode: "insensitive" as const } },
      ]),
    },
    take: 3,
  });
  if (entries.length === 0) return "";

  return `\n\nKonteks basis pengetahuan perusahaan yang relevan:\n${entries
    .map((e) => `- ${e.title}: ${e.content.slice(0, 400)}`)
    .join("\n")}`;
}
