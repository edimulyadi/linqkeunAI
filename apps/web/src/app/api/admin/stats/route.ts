export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const [userCount, generationCount, conversationCount, topTools] =
      await Promise.all([
        db.user.count(),
        db.generation.count(),
        db.conversation.count(),
        db.generation.groupBy({
          by: ["toolId"],
          _count: { toolId: true },
          orderBy: { _count: { toolId: "desc" } },
          take: 5,
        }),
      ]);

    const toolIds = topTools.map((t) => t.toolId);
    const tools = await db.aiTool.findMany({
      where: { id: { in: toolIds } },
      select: { id: true, title: true, slug: true },
    });
    const toolMap = new Map(tools.map((t) => [t.id, t]));

    return Response.json({
      userCount,
      generationCount,
      conversationCount,
      topTools: topTools.map((t) => ({
        tool: toolMap.get(t.toolId),
        count: t._count.toolId,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
