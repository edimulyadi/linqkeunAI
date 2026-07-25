import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Lazily-constructed singleton so builds without ANTHROPIC_API_KEY don't crash. */
export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Per skill guidance: default to Claude Opus 5 unless the caller names another model.
export const DEFAULT_MODEL = "claude-opus-5";

export type GenerationEffort = "low" | "medium" | "high" | "xhigh" | "max";

interface StreamTextOptions {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  effort?: GenerationEffort;
  maxTokens?: number;
}

/**
 * Streams a plain-text response from Claude and returns both the readable
 * stream (to forward to the client) and a promise that resolves with the
 * full text + token usage once generation completes (for persistence).
 */
export function streamText({
  system,
  messages,
  effort = "medium",
  maxTokens = 4096,
}: StreamTextOptions) {
  const anthropic = getAnthropic();

  const apiStream = anthropic.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    system,
    output_config: { effort },
    messages,
  });

  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  let resolveUsage!: (v: {
    inputTokens: number;
    outputTokens: number;
    text: string;
  }) => void;
  const usage = new Promise<{
    inputTokens: number;
    outputTokens: number;
    text: string;
  }>((resolve) => {
    resolveUsage = resolve;
  });

  // Consume the raw event stream directly (async iterator) rather than
  // mixing `.on()` listeners with `.finalMessage()` — doing both at once
  // trips a known SDK state-machine bug when the request fails before any
  // content arrives (e.g. an invalid API key).
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of apiStream) {
          if (event.type === "message_start") {
            inputTokens = event.message.usage.input_tokens;
          } else if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          } else if (event.type === "message_delta") {
            outputTokens = event.usage.output_tokens;
          }
        }
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Terjadi kesalahan pada AI";
        controller.enqueue(
          encoder.encode(`\n\n[Kesalahan AI] ${message}`)
        );
        controller.close();
      } finally {
        resolveUsage({ inputTokens, outputTokens, text: fullText });
      }
    },
    cancel() {
      apiStream.abort();
    },
  });

  return { readable, usage };
}
