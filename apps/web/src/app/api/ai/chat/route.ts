export const dynamic = "force-dynamic";

import { z } from "zod";
import { Prisma } from "@linqkeun/database";
import { db } from "@/lib/db";
import { requireUser, errorResponse, ApiError } from "@/lib/session";
import { runAgentTurn } from "@/ai/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  agentSlug: z.string(),
  conversationId: z.string().optional(),
  message: z.string().min(1).max(4000),
});

// Lists this user's conversations (optionally scoped to one agent), or a
// single conversation's full message history.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");

    if (conversationId) {
      const conversation = await db.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          agent: { select: { slug: true, title: true, avatarIcon: true, color: true } },
        },
      });
      if (!conversation) throw new ApiError(404, "Percakapan tidak ditemukan");
      return Response.json({ conversation });
    }

    const agentSlug = url.searchParams.get("agentSlug");
    const conversations = await db.conversation.findMany({
      where: { userId: user.id, ...(agentSlug ? { agent: { slug: agentSlug } } : {}) },
      orderBy: { updatedAt: "desc" },
      include: { agent: { select: { slug: true, title: true, avatarIcon: true, color: true } } },
    });
    return Response.json({ conversations });
  } catch (error) {
    return errorResponse(error);
  }
}

// Sends a message to an agent. Non-streaming: the agent may call tools
// (business metrics, tasks, knowledge base) before answering, which
// requires buffering the full response — see runWithTools in
// src/lib/anthropic.ts for why this trades streaming for real tool use.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { agentSlug, conversationId, message } = bodySchema.parse(await req.json());

    const agentRow = await db.agent.findUnique({ where: { slug: agentSlug } });
    if (!agentRow || !agentRow.isActive) {
      throw new ApiError(404, "Agent tidak ditemukan atau tidak aktif");
    }

    let conversation = conversationId
      ? await db.conversation.findFirst({
          where: { id: conversationId, userId: user.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : null;

    if (!conversation) {
      conversation = await db.conversation.create({
        data: { userId: user.id, agentId: agentRow.id, title: message.slice(0, 60) },
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

    const result = await runAgentTurn({
      agentSlug,
      userId: user.id,
      message,
      history,
    });

    const conversationId2 = conversation.id;
    await db.$transaction([
      db.message.create({
        data: {
          conversationId: conversationId2,
          role: "assistant",
          content: result.text,
          toolCalls: result.toolCalls.length
            ? (JSON.parse(JSON.stringify(result.toolCalls)) as Prisma.InputJsonValue)
            : undefined,
        },
      }),
      db.conversation.update({ where: { id: conversationId2 }, data: { updatedAt: new Date() } }),
      db.activityLog.create({
        data: {
          userId: user.id,
          agentId: agentRow.id,
          action: "agent.chat",
          entityType: "Conversation",
          entityId: conversationId2,
        },
      }),
    ]);

    return Response.json({
      conversationId: conversation.id,
      agent: result.agent,
      reply: { content: result.text, toolCalls: result.toolCalls },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorResponse(error);
  }
}
