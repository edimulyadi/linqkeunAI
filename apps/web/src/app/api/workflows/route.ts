export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";

export async function GET(req: Request) {
  try {
    await requireUser(req);
    const workflows = await db.workflowRule.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        targetAgent: { select: { slug: true, title: true, avatarIcon: true, color: true } },
        runs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    return Response.json({ workflows });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  triggerType: z.enum(["METRIC_THRESHOLD", "MANUAL", "SCHEDULE"]),
  triggerConfig: z.record(z.any()).default({}),
  actionType: z.enum(["CREATE_TASK", "RUN_AGENT"]),
  actionConfig: z.record(z.any()).default({}),
  targetAgentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const data = createSchema.parse(await req.json());
    const workflow = await db.workflowRule.create({
      data: { ...data, createdByUserId: user.id },
    });
    return Response.json({ workflow }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
