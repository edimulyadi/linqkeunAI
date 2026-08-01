export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

// Aggregated data for the Reports page: KPI time series, task completion
// breakdown, and per-agent utilization (tasks + conversations).
export async function GET(req: Request) {
  try {
    await requireUser(req);

    const [metricRows, taskGroups, agents, conversationGroups] = await Promise.all([
      db.businessMetric.findMany({ orderBy: { periodDate: "asc" } }),
      db.task.groupBy({ by: ["status"], _count: { status: true } }),
      db.agent.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true, color: true },
      }),
      db.conversation.groupBy({ by: ["agentId"], _count: { agentId: true } }),
    ]);

    const metricsByKey = new Map<string, { period: string; value: number }[]>();
    for (const row of metricRows) {
      const list = metricsByKey.get(row.metricKey) ?? [];
      list.push({ period: row.periodDate.toISOString().slice(0, 7), value: row.value });
      metricsByKey.set(row.metricKey, list);
    }

    const taskCounts = await db.task.groupBy({
      by: ["assignedAgentId"],
      _count: { assignedAgentId: true },
      where: { assignedAgentId: { not: null } },
    });
    const taskCountByAgent = new Map(taskCounts.map((t) => [t.assignedAgentId, t._count.assignedAgentId]));
    const convoCountByAgent = new Map(conversationGroups.map((c) => [c.agentId, c._count.agentId]));

    return Response.json({
      metrics: Object.fromEntries(metricsByKey),
      taskStats: {
        total: taskGroups.reduce((sum, g) => sum + g._count.status, 0),
        byStatus: Object.fromEntries(taskGroups.map((g) => [g.status, g._count.status])),
      },
      agentUtilization: agents.map((a) => ({
        agentSlug: a.slug,
        title: a.title,
        color: a.color,
        taskCount: taskCountByAgent.get(a.id) ?? 0,
        conversationCount: convoCountByAgent.get(a.id) ?? 0,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
