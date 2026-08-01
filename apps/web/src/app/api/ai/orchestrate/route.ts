export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/session";
import { runAgentTurn } from "@/ai/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 90;

const bodySchema = z.object({
  question: z.string().min(1).max(4000),
});

// "Ask the whole company" flow: User → CEO AI → CEO AI delegates to the
// relevant specialists (Finance/HR/Marketing/Operations) via the
// delegate_to_agent tool → combined, synthesized response returned. This is
// the multi-agent orchestration flow described in the product spec.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { question } = bodySchema.parse(await req.json());

    const result = await runAgentTurn({
      agentSlug: "ceo-ai",
      userId: user.id,
      message: question,
      forceDelegation: true,
    });

    const consulted = result.toolCalls
      .filter((c) => c.name === "delegate_to_agent")
      .map((c) => ({ agentSlug: (c.input as { agentSlug?: string })?.agentSlug, result: c.result }));

    await db.activityLog.create({
      data: {
        userId: user.id,
        agentId: result.agent.id,
        action: "agent.orchestrate",
        entityType: "Agent",
        entityId: result.agent.id,
        metadata: { consultedAgents: consulted.map((c) => c.agentSlug ?? null) },
      },
    });

    return Response.json({
      agent: result.agent,
      answer: result.text,
      consulted,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
