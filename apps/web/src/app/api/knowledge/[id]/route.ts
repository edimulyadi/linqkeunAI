export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(8000).optional(),
  category: z.string().min(1).max(60).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser(req);
    const data = updateSchema.parse(await req.json());
    const entry = await db.knowledgeBaseEntry.update({ where: { id: params.id }, data });
    return Response.json({ entry });
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
    await db.knowledgeBaseEntry.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
