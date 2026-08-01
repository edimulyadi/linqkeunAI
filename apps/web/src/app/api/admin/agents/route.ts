export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, errorResponse } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const agents = await db.agent.findMany({ orderBy: { order: "asc" } });
    return Response.json({ agents });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  roleType: z.enum(["CEO", "FINANCE", "HR", "MARKETING", "OPERATIONS", "CUSTOM"]),
  title: z.string().min(1),
  description: z.string().min(1),
  avatarIcon: z.string().default("bot"),
  color: z.string().default("#f0b429"),
  systemPrompt: z.string().min(1),
  skills: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const data = createSchema.parse(await req.json());
    const agent = await db.agent.create({ data });
    return Response.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
