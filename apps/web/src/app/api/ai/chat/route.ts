export const dynamic = "force-dynamic";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, errorResponse, ApiError } from "@/lib/session";
import { streamText } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  toolSlug: z.string(),
  conversationId: z.string().optional(),
  message: z.string().min(1).max(4000),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    if (!conversationId) {
      // List this user's conversations
      const conversations = await db.conversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: { tool: { select: { slug: true, title: true, icon: true } } },
      });
      return Response.json({ conversations });
    }

    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) throw new ApiError(404, "Percakapan tidak ditemukan");
    return Response.json({ conversation });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { toolSlug, conversationId, message } = bodySchema.parse(
      await req.json()
    );

    const tool = await db.aiTool.findUnique({ where: { slug: toolSlug } });
    if (!tool || !tool.isActive) {
      throw new ApiError(404, "Tool tidak ditemukan atau tidak aktif");
    }

    let conversation = conversationId
      ? await db.conversation.findFirst({
          where: { id: conversationId, userId: user.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : null;

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          userId: user.id,
          toolId: tool.id,
          title: message.slice(0, 60),
        },
        include: { messages: true },
      });
    }

    const history = conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    await db.message.create({
      data: { conversationId: conversation.id, role: "user", content: message },
    });

    const { readable, usage } = streamText({
      system: tool.systemPrompt,
      messages: [...history, { role: "user", content: message }],
      effort: "medium",
      maxTokens: 4096,
    });

    const conversationId2 = conversation.id;
    usage.then(({ inputTokens, outputTokens, text }) => {
      db.$transaction([
        db.message.create({
          data: {
            conversationId: conversationId2,
            role: "assistant",
            content: text,
          },
        }),
        db.conversation.update({
          where: { id: conversationId2 },
          data: { updatedAt: new Date() },
        }),
        db.generation.create({
          data: {
            userId: user.id,
            toolId: tool.id,
            input: { message },
            output: text,
            inputTokens,
            outputTokens,
          },
        }),
      ]).catch((err) => console.error("Failed to persist chat turn:", err));
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Conversation-Id": conversation.id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
