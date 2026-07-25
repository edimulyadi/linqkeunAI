export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const tools = await db.aiTool.findMany({
      orderBy: [{ categoryId: "asc" }, { order: "asc" }],
      include: { category: { select: { title: true, slug: true } } },
    });
    return Response.json({ tools });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  categoryId: z.string(),
  code: z.string(),
  slug: z.string(),
  title: z.string(),
  icon: z.string().default("bot"),
  description: z.string(),
  kind: z.enum([
    "CONTENT_GENERATION",
    "CHAT_ASSISTANT",
    "LANDING_PAGE",
    "IMAGE_PROMPT",
    "CONNECTOR",
  ]),
  systemPrompt: z.string(),
  priceRupiah: z.number().int().default(0),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const data = createSchema.parse(await req.json());
    const tool = await db.aiTool.create({ data });
    return Response.json({ tool }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
