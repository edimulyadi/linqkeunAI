export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireUser(req);
    const entries = await db.knowledgeBaseEntry.findMany({
      orderBy: { updatedAt: "desc" },
      include: { createdByUser: { select: { name: true } } },
    });
    return Response.json({ entries });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(8000),
  category: z.string().min(1).max(60).default("general"),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const data = createSchema.parse(await req.json());
    const entry = await db.knowledgeBaseEntry.create({
      data: { ...data, createdByUserId: user.id },
    });
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
