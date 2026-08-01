export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

// List active AI co-worker agents — used by the chat agent switcher and the
// task "assign to" dropdown, on both web and mobile.
export async function GET(req: Request) {
  try {
    await requireUser(req);
    const agents = await db.agent.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        roleType: true,
        title: true,
        description: true,
        avatarIcon: true,
        color: true,
        skills: true,
      },
    });
    return Response.json({ agents });
  } catch (error) {
    return errorResponse(error);
  }
}
