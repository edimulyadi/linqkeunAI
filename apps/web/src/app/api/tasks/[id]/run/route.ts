export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { requireUser, errorResponse, ApiError } from "@/lib/session";
import { runAgentTurn } from "@/ai/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 90;

// Asks the task's assigned AI agent to actually do the work: the agent
// reads the task title/description (with its usual tools available),
// writes its output into `result`, and the task moves to DONE.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const task = await db.task.findUnique({
      where: { id: params.id },
      include: { assignedAgent: true },
    });
    if (!task) throw new ApiError(404, "Tugas tidak ditemukan");
    if (!task.assignedAgent) {
      throw new ApiError(400, "Tugas ini belum ditugaskan ke AI agent");
    }

    await db.task.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });

    const result = await runAgentTurn({
      agentSlug: task.assignedAgent.slug,
      userId: user.id,
      message: `Kerjakan tugas berikut dan berikan hasilnya secara langsung (bukan pertanyaan klarifikasi kecuali benar-benar diperlukan):\n\nJudul: ${task.title}\nDeskripsi: ${task.description}`,
    });

    const updated = await db.task.update({
      where: { id: task.id },
      data: { status: "DONE", result: result.text },
      include: { assignedAgent: { select: { slug: true, title: true, avatarIcon: true, color: true } } },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        agentId: task.assignedAgent.id,
        action: "task.completed_by_ai",
        entityType: "Task",
        entityId: task.id,
      },
    });

    return Response.json({ task: updated, toolCalls: result.toolCalls });
  } catch (error) {
    return errorResponse(error);
  }
}
