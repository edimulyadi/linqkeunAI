export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const [userCount, taskCount, conversationCount, workflowCount, topAgents] = await Promise.all([
      db.user.count(),
      db.task.count(),
      db.conversation.count(),
      db.workflowRule.count({ where: { isActive: true } }),
      db.conversation.groupBy({
        by: ["agentId"],
        _count: { agentId: true },
        orderBy: { _count: { agentId: "desc" } },
        take: 5,
      }),
    ]);

    const agentIds = topAgents.map((a) => a.agentId);
    const agents = await db.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, title: true, slug: true },
    });
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    return Response.json({
      userCount,
      taskCount,
      conversationCount,
      activeWorkflowCount: workflowCount,
      topAgents: topAgents.map((a) => ({
        agent: agentMap.get(a.agentId),
        count: a._count.agentId,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
