"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

interface ToolDetail {
  id: string;
  code: string;
  slug: string;
  title: string;
  description: string;
  kind: string;
  category: { title: string };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function streamToText(
  res: Response,
  onDelta: (chunk: string) => void
): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}

export default function ToolRunnerPage() {
  const params = useParams<{ slug: string }>();
  const [tool, setTool] = useState<ToolDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Single-shot generator state
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();

  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/tools/${params.slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setTool(data.tool))
      .catch(() => setNotFound(true));
  }, [params.slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function runGenerate() {
    if (!tool || !input.trim() || busy) return;
    setBusy(true);
    setOutput("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolSlug: tool.slug, input }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setOutput(`Terjadi kesalahan: ${data.error ?? res.statusText}`);
        return;
      }
      await streamToText(res, (chunk) => setOutput((prev) => prev + chunk));
    } finally {
      setBusy(false);
    }
  }

  async function sendChat() {
    if (!tool || !chatInput.trim() || busy) return;
    const userMsg = chatInput;
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolSlug: tool.slug,
          conversationId,
          message: userMsg,
        }),
      });
      const newConversationId = res.headers.get("X-Conversation-Id");
      if (newConversationId) setConversationId(newConversationId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: `Terjadi kesalahan: ${data.error ?? res.statusText}`,
          };
          return copy;
        });
        return;
      }

      await streamToText(res, (chunk) => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      });
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return <p className="text-white/60">Tool tidak ditemukan.</p>;
  }
  if (!tool) {
    return <p className="text-white/60">Memuat...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-white/50">{tool.category.title}</p>
        <h1 className="text-2xl font-bold">{tool.title}</h1>
        <p className="mt-1 text-white/60">{tool.description}</p>
      </div>

      {tool.kind === "CHAT_ASSISTANT" ? (
        <div className="card flex h-[60vh] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-white/40">
                Mulai percakapan dengan {tool.title} di bawah ini.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-brand-500 text-ink-900"
                    : "bg-white/5 text-white"
                }`}
              >
                {m.content || (busy && i === messages.length - 1 ? "..." : "")}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChat();
            }}
            className="mt-4 flex gap-2"
          >
            <input
              className="input"
              placeholder="Tulis pesan..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={busy}
            />
            <button className="btn-primary" disabled={busy || !chatInput.trim()}>
              Kirim
            </button>
          </form>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <label className="mb-2 block text-sm font-medium text-white/70">
              Brief / masukan Anda
            </label>
            <textarea
              className="input h-56 resize-none"
              placeholder="Jelaskan produk, target audiens, dan tujuan Anda..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button
              onClick={runGenerate}
              className="btn-primary mt-4 w-full"
              disabled={busy || !input.trim()}
            >
              {busy ? "Membuat..." : "Buat Sekarang"}
            </button>
          </div>
          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-white/70">Hasil</label>
              {tool.kind === "LANDING_PAGE" && output && (
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setShowPreview(true)}
                    className={
                      showPreview ? "text-brand-400" : "text-white/40"
                    }
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className={
                      !showPreview ? "text-brand-400" : "text-white/40"
                    }
                  >
                    Kode
                  </button>
                </div>
              )}
            </div>
            {tool.kind === "LANDING_PAGE" && output && showPreview ? (
              <iframe
                srcDoc={output}
                className="h-56 w-full rounded-lg border border-white/10 bg-white"
                sandbox=""
              />
            ) : (
              <pre className="h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-900 p-3 text-sm text-white/80">
                {output || "Hasil akan muncul di sini."}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
