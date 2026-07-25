export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, errorResponse, ApiError } from "@/lib/session";
import { streamText } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  toolSlug: z.string(),
  input: z.string().min(1).max(8000),
});

// One-shot content generation for CONTENT_GENERATION / LANDING_PAGE /
// IMAGE_PROMPT tools. Streams plain text back to the caller and persists
// a Generation record once the model finishes.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { toolSlug, input } = bodySchema.parse(await req.json());

    const tool = await db.aiTool.findUnique({ where: { slug: toolSlug } });
    if (!tool || !tool.isActive) {
      throw new ApiError(404, "Tool tidak ditemukan atau tidak aktif");
    }
    if (tool.kind === "CHAT_ASSISTANT") {
      throw new ApiError(
        400,
        "Tool ini bersifat percakapan — gunakan endpoint /api/ai/chat"
      );
    }

    const effort = tool.kind === "LANDING_PAGE" ? "high" : "medium";
    const { readable, usage } = streamText({
      system: tool.systemPrompt,
      messages: [{ role: "user", content: input }],
      effort,
      maxTokens: tool.kind === "LANDING_PAGE" ? 8000 : 4096,
    });

    // Persist once the model finishes, without blocking the streamed response.
    usage.then(({ inputTokens, outputTokens, text }) => {
      db.generation
        .create({
          data: {
            userId: user.id,
            toolId: tool.id,
            input: { input },
            output: text,
            inputTokens,
            outputTokens,
          },
        })
        .catch((err) => console.error("Failed to persist generation:", err));
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Tool-Kind": tool.kind,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
