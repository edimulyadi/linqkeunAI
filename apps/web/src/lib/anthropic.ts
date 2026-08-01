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

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCallRecord {
  name: string;
  input: unknown;
  result: string;
}

interface RunWithToolsOptions<Ctx> {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  tools?: ToolDefinition[];
  executors?: Record<string, (input: any, ctx: Ctx) => Promise<string>>;
  ctx?: Ctx;
  effort?: GenerationEffort;
  maxTokens?: number;
  /** Safety cap on tool-call round-trips (each round is one more API call). */
  maxIterations?: number;
  /** Forces the model to call a tool on the first round (e.g. CEO "ask all agents" orchestration). */
  forceToolUseOnFirstRound?: boolean;
}

interface RunWithToolsResult {
  text: string;
  toolCalls: ToolCallRecord[];
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Drives a full agentic tool-use loop against Claude: send the conversation
 * (+ tool definitions), execute any tools the model calls against the
 * supplied executors, feed the results back, and repeat until the model
 * produces a final text answer (or `maxIterations` is hit).
 *
 * This is intentionally non-streaming: tool use requires buffering the
 * model's tool_use blocks before we can act on them, so there is no partial
 * text to stream until the final round. API routes that want a "thinking"
 * indicator should show one client-side while this promise is in flight.
 */
export async function runWithTools<Ctx = unknown>({
  system,
  messages,
  tools = [],
  executors = {},
  ctx,
  effort = "medium",
  maxTokens = 2048,
  maxIterations = 4,
  forceToolUseOnFirstRound = false,
}: RunWithToolsOptions<Ctx>): Promise<RunWithToolsResult> {
  const anthropic = getAnthropic();
  const conversation: Anthropic.Messages.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const toolCalls: ToolCallRecord[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      output_config: { effort },
      messages: conversation,
      ...(tools.length ? { tools } : {}),
      ...(tools.length && forceToolUseOnFirstRound && iteration === 0
        ? { tool_choice: { type: "any" as const } }
        : {}),
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      return { text, toolCalls, usage: { inputTokens, outputTokens } };
    }

    conversation.push({ role: "assistant", content: response.content });

    const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const executor = executors[block.name];
      let result: string;
      try {
        result = executor
          ? await executor(block.input, ctx as Ctx)
          : `Tool "${block.name}" is not available to this agent.`;
      } catch (err) {
        result = `Tool error: ${err instanceof Error ? err.message : "unknown error"}`;
      }
      toolCalls.push({ name: block.name, input: block.input, result });
      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }
    conversation.push({ role: "user", content: toolResultBlocks });
  }

  return {
    text: "Saya butuh lebih banyak langkah untuk menyelesaikan ini dari yang diizinkan — coba pertanyaan yang lebih spesifik.",
    toolCalls,
    usage: { inputTokens, outputTokens },
  };
}
