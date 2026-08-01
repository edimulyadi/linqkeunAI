export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/session";

const updateSchema = z.object({
  name: z.string().optional(),
  roleType: z.enum(["CEO", "FINANCE", "HR", "MARKETING", "OPERATIONS", "CUSTOM"]).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  avatarIcon: z.string().optional(),
  color: z.string().optional(),
  systemPrompt: z.string().optional(),
  skills: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    const data = updateSchema.parse(await req.json());
    const agent = await db.agent.update({ where: { id: params.id }, data });
    return Response.json({ agent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req);
    await db.agent.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
