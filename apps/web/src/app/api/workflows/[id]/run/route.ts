export const dynamic = "force-dynamic";

import { requireUser, errorResponse } from "@/lib/session";
import { evaluateAndRunWorkflow } from "@/ai/workflow-engine";

export const runtime = "nodejs";
export const maxDuration = 90;

// Manually evaluates + (if the trigger condition holds) executes a
// workflow rule. In production this same function is the integration
// point for a scheduler (see docs/DEPLOYMENT.md#automation-scheduling).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const outcome = await evaluateAndRunWorkflow(params.id, user.id);
    return Response.json(outcome);
  } catch (error) {
    return errorResponse(error);
  }
}
