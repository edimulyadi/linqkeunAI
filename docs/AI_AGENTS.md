# AI Agent System

Linqkeun AI ships 5 AI co-worker agents, seeded by
[`packages/database/seed.js`](../packages/database/seed.js). Every agent is a
row in the `Agent` table — title, description, skills, tools, and (most
importantly) `systemPrompt` are all editable from `/admin/agents` without a
code deploy.

## Agent identity

Each `Agent` row has:

| Field | Purpose |
|---|---|
| `slug` | Stable identifier used in URLs and API calls (e.g. `finance-ai`) |
| `roleType` | `CEO` \| `FINANCE` \| `HR` \| `MARKETING` \| `OPERATIONS` \| `CUSTOM` |
| `systemPrompt` | The agent's persona, working principles, and instructions on when to use its tools |
| `skills` | Short display labels shown in the chat header (`String[]`) |
| `tools` | Which of the static tools (below) this agent is allowed to call (`String[]`) |

## The 5 seeded agents

| Agent | Role | Tools |
|---|---|---|
| **CEO AI** | Strategic synthesis — delegates to specialists and combines their answers | `delegate_to_agent`, `get_business_metrics`, `list_tasks`, `search_knowledge_base` |
| **Finance AI** | Cash flow analysis, revenue forecasting, cost optimization | `get_business_metrics`, `list_tasks`, `create_task`, `search_knowledge_base` |
| **HR AI** | Recruitment, performance review, HR policy | `list_tasks`, `create_task`, `search_knowledge_base` |
| **Marketing AI** | Campaign strategy, content, funnel optimization | `get_business_metrics`, `list_tasks`, `create_task`, `search_knowledge_base` |
| **Operations AI** | Process optimization, workflow automation, vendor management | `get_business_metrics`, `list_tasks`, `create_task`, `search_knowledge_base` |

Full system prompts are in `packages/database/seed.js` and editable per-agent
in `/admin/agents`.

## Tools (functions agents can call)

Implemented in [`apps/web/src/ai/tools.ts`](../apps/web/src/ai/tools.ts) as
real, DB-backed functions — not simulated:

- **`get_business_metrics`** — reads `BusinessMetric` rows (revenue, expenses,
  customers, tasksCompleted) as a time series.
- **`list_tasks`** — reads `Task` rows, optionally filtered by status or
  assigned agent.
- **`create_task`** — inserts a `Task` row, optionally assigned to another
  agent. Used by agents to turn a conversation into tracked work.
- **`search_knowledge_base`** — keyword search (`ILIKE` on title/content) over
  `KnowledgeBaseEntry`. The same keyword search also runs automatically on
  every turn to inject relevant context into the system prompt (see
  "Memory" below) — the explicit tool lets an agent search *again* mid-turn
  with a more specific query.
- **`delegate_to_agent`** — CEO-only. Calls another agent's `runAgentTurn`
  (with delegation disabled on the sub-call, to prevent recursive loops) and
  returns its answer as a tool result.

Which tools an agent can use is controlled entirely by its `tools` column —
adding a new tool means implementing it once in `tools.ts` and then flipping
it on for whichever agents should have it, no code change to the agents
themselves required.

## The agent router / orchestrator

[`apps/web/src/ai/orchestrator.ts`](../apps/web/src/ai/orchestrator.ts)'s
`runAgentTurn()` is the single entry point every agent interaction goes
through:

1. Loads the `Agent` row by slug and checks it's active.
2. Builds the tool list + executor map from `STATIC_TOOLS`, filtered to the
   agent's `tools` column.
3. If the agent is CEO, adds a dynamically-built `delegate_to_agent` tool
   (its description lists the other active agents by slug).
4. Runs a lightweight keyword-overlap retrieval against
   `KnowledgeBaseEntry` and appends any matches to the system prompt as
   "Konteks basis pengetahuan perusahaan yang relevan" — this is the
   "knowledge base as AI context" feature, implemented without a vector DB.
5. Calls `runWithTools()` (`apps/web/src/lib/anthropic.ts`), which drives the
   full Claude tool-use loop: send → execute any tool calls → feed results
   back → repeat until a final text answer (capped at `maxIterations`).

### Multi-agent collaboration flow

```
User → CEO AI
  → CEO AI calls delegate_to_agent("finance-ai", "...")
      → runAgentTurn(financeAi, allowDelegation: false) → Finance AI's answer
  → CEO AI calls delegate_to_agent("marketing-ai", "...")
      → runAgentTurn(marketingAi, allowDelegation: false) → Marketing AI's answer
  → CEO AI synthesizes both into one combined recommendation
```

This is exposed two ways:
- Automatically, whenever the CEO agent's own judgement (per its system
  prompt) decides a question spans multiple domains.
- Forced, via `POST /api/ai/orchestrate` (`forceDelegation: true`, which sets
  `tool_choice: {type: "any"}` on the first round) — this is what the
  dashboard's "Konsultasikan ke semua AI" toggle uses.

### Memory

- **Short-term (per conversation):** `Conversation` + `Message` rows,
  replayed as history on every turn — same pattern as a normal chatbot.
- **Long-term (company context):** `KnowledgeBaseEntry`, retrieved by keyword
  overlap and injected into the system prompt (see step 4 above). Managed
  from `/dashboard/settings`.
- **Cross-agent:** `Task` rows are visible to every agent via `list_tasks`,
  so e.g. Finance AI can see a task Marketing AI created.

### Why chat is non-streaming

Real tool use requires buffering the model's `tool_use` blocks before you can
act on them — there's no meaningful "partial text" to stream until a tool
round finishes and the model starts its final answer. `runWithTools()` is
therefore a plain `await`, and `POST /api/ai/chat` / `/api/ai/orchestrate`
return complete JSON responses. The UI shows a "sedang berpikir..." indicator
while the request is in flight instead of a token-by-token stream.

## Workflow automation

[`apps/web/src/ai/workflow-engine.ts`](../apps/web/src/ai/workflow-engine.ts)'s
`evaluateAndRunWorkflow()` implements the "IF trigger THEN action" automation
described in the product spec (e.g. *"IF revenue drops → Marketing AI
generates a campaign"*):

- **Triggers:** `METRIC_THRESHOLD` (compares the two most recent
  `BusinessMetric` rows for a given `metricKey` using a comparator —
  `drop_percent`, `rise_percent`, `below`, `above`), `MANUAL` (always fires
  when explicitly run), `SCHEDULE` (same as manual, intended to be invoked by
  a scheduler — see `docs/DEPLOYMENT.md`).
- **Actions:** `CREATE_TASK` (inserts a `Task` assigned to the rule's
  `targetAgent`) or `RUN_AGENT` (calls `runAgentTurn` immediately and logs
  the agent's response).
- Every evaluation — whether the condition held or not — is recorded as a
  `WorkflowRun` row, visible in `/dashboard/settings`.

The seeded "Peringatan Penurunan Pendapatan" rule demonstrates this end to
end: seed data includes a ~16% revenue drop in the most recent month, so
running that rule from Settings immediately creates a real task for
Marketing AI.

## Adding a new agent

**Without touching code:** log in as admin, go to `/admin/agents`, click
"Agent Baru", and fill in slug/title/description/skills/tools/system prompt.

**Via the seed script (for changes you want version-controlled):** add an
entry to `AGENTS` in `packages/database/seed.js`, then run `npm run db:seed`
(idempotent — upserts by `slug`).

**System prompt guidelines:** every agent's `systemPrompt` should (1) state
the persona/role clearly, (2) give explicit instructions on *when* to call
each of its tools and to never fabricate data a tool could answer, and (3)
describe the output style expected (concise, structured, etc.) — see the 5
seeded prompts for the house style.
