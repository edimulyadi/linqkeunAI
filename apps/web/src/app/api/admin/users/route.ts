export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        subscription: { select: { planCode: true, status: true } },
        _count: { select: { conversations: true, tasksCreated: true } },
      },
    });
    return Response.json({ users });
  } catch (error) {
    return errorResponse(error);
  }
}
