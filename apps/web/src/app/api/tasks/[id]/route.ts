export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(4000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedAgentId: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const data = updateSchema.parse(await req.json());

    const task = await db.task.update({
      where: { id: params.id },
      data: {
        ...data,
        dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "task.updated",
        entityType: "Task",
        entityId: task.id,
        metadata: { fields: Object.keys(data) },
      },
    });

    return Response.json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    await db.task.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
