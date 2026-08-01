"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Agent {
  id: string;
  slug: string;
  name: string;
  roleType: string;
  title: string;
  description: string;
  avatarIcon: string;
  color: string;
  skills: string[];
}

interface ToolCall {
  name: string;
  input: unknown;
  result: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  pending?: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AgentChatPage() {
  const params = useParams<{ agentSlug: string }>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [orchestrate, setOrchestrate] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => setAgents(data.agents ?? []));
  }, []);

  const agent = agents.find((a) => a.slug === params.agentSlug);

  useEffect(() => {
    setMessages([]);
    setConversationId(undefined);
    setOrchestrate(false);
    setLoadingHistory(true);

    fetch(`/api/ai/chat?agentSlug=${params.agentSlug}`)
      .then((res) => res.json())
      .then(async (data) => {
        const latest = data.conversations?.[0];
        if (!latest) return;
        setConversationId(latest.id);
        const detail = await fetch(`/api/ai/chat?conversationId=${latest.id}`).then((r) => r.json());
        const loaded: ChatMessage[] = (detail.conversation?.messages ?? []).map((m: any) => ({
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls ?? undefined,
        }));
        setMessages(loaded);
      })
      .finally(() => setLoadingHistory(false));
  }, [params.agentSlug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function newChat() {
    setMessages([]);
    setConversationId(undefined);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy || !agent) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setBusy(true);

    try {
      if (agent.roleType === "CEO" && orchestrate) {
        const res = await fetch("/api/ai/orchestrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessages((prev) => [...prev, { role: "assistant", content: `Terjadi kesalahan: ${data.error ?? res.statusText}` }]);
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer,
            toolCalls: (data.consulted ?? []).map((c: { agentSlug: string; result: string }) => ({
              name: "delegate_to_agent",
              input: { agentSlug: c.agentSlug },
              result: c.result,
            })),
          },
        ]);
        return;
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug: agent.slug, conversationId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Terjadi kesalahan: ${data.error ?? res.statusText}` }]);
        return;
      }
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply.content, toolCalls: data.reply.toolCalls }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-2">
        <button onClick={newChat} className="btn-secondary w-full text-sm">
          + Percakapan baru
        </button>
        {agents.map((a) => (
          <Link
            key={a.slug}
            href={`/dashboard/chat/${a.slug}`}
            className={`flex items-center gap-3 rounded-xl border p-3 transition ${
              a.slug === params.agentSlug
                ? "border-brand-400/50 bg-brand-400/10"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: `${a.color}22`, color: a.color }}
            >
              {initials(a.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{a.title}</p>
              <p className="truncate text-xs text-white/50">{a.description}</p>
            </div>
          </Link>
        ))}
      </aside>

      <div className="card flex h-[72vh] flex-col">
        {agent && (
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h1 className="text-lg font-bold">{agent.title}</h1>
              <p className="text-xs text-white/50">{agent.skills.join(" • ")}</p>
            </div>
            {agent.roleType === "CEO" && (
              <label className="flex items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={orchestrate}
                  onChange={(e) => setOrchestrate(e.target.checked)}
                />
                Konsultasikan ke semua AI
              </label>
            )}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {loadingHistory ? (
            <p className="text-sm text-white/40">Memuat riwayat...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-white/40">Mulai percakapan dengan {agent?.title ?? "agent"} di bawah ini.</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                    m.role === "user" ? "bg-brand-500 text-ink-900" : "bg-white/5 text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.toolCalls.map((tc, j) => (
                        <span
                          key={j}
                          title={tc.result.slice(0, 300)}
                          className="cursor-help rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/50"
                        >
                          🔧 {tc.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-white/5 px-4 py-2 text-sm text-white/40">
                {agent?.title ?? "Agent"} sedang berpikir...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mt-4 flex gap-2"
        >
          <input
            className="input"
            placeholder={`Tanya ${agent?.title ?? "agent"}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button className="btn-primary" disabled={busy || !input.trim()}>
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}
