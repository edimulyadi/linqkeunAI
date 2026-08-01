export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

// Recent activity feed for the dashboard ("who/what did what, when").
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 15, 50);

    const logs = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { name: true } },
        agent: { select: { title: true, avatarIcon: true, color: true } },
      },
    });
    return Response.json({ logs });
  } catch (error) {
    return errorResponse(error);
  }
}
