export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(1000).optional(),
  triggerType: z.enum(["METRIC_THRESHOLD", "MANUAL", "SCHEDULE"]).optional(),
  triggerConfig: z.record(z.any()).optional(),
  actionType: z.enum(["CREATE_TASK", "RUN_AGENT"]).optional(),
  actionConfig: z.record(z.any()).optional(),
  targetAgentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    const data = updateSchema.parse(await req.json());
    const workflow = await db.workflowRule.update({ where: { id: params.id }, data });
    return Response.json({ workflow });
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
    await db.workflowRule.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
