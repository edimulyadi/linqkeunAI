export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/session";

const updateSchema = z.object({
  categoryId: z.string().optional(),
  code: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  kind: z
    .enum([
      "CONTENT_GENERATION",
      "CHAT_ASSISTANT",
      "LANDING_PAGE",
      "IMAGE_PROMPT",
      "CONNECTOR",
    ])
    .optional(),
  systemPrompt: z.string().optional(),
  priceRupiah: z.number().int().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);
    const data = updateSchema.parse(await req.json());
    const tool = await db.aiTool.update({ where: { id: params.id }, data });
    return Response.json({ tool });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);
    await db.aiTool.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
