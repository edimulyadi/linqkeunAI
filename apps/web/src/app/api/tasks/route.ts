export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireUser(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const agentSlug = url.searchParams.get("agentSlug");

    const tasks = await db.task.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(agentSlug ? { assignedAgent: { slug: agentSlug } } : {}),
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: {
        assignedAgent: { select: { slug: true, title: true, avatarIcon: true, color: true } },
        assignedUser: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    return Response.json({ tasks });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assignedAgentId: z.string().optional(),
  assignedUserId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const data = createSchema.parse(await req.json());

    const task = await db.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdByUserId: user.id,
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "task.created",
        entityType: "Task",
        entityId: task.id,
        metadata: { title: task.title },
      },
    });

    return Response.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
