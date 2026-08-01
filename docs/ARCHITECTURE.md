# Architecture

## Overview

```
                         ┌─────────────────────────┐
                         │        Postgres          │
                         │  (users, agents, tasks,  │
                         │  workflows, metrics, ...) │
                         └────────────▲──────────────┘
                                      │ Prisma
                         ┌────────────┴──────────────┐
                         │   apps/web (Next.js 14)    │
                         │  ┌───────────────────────┐ │
   Browser ─────────────▶│  │  Marketing site (/)   │ │
   (web app)              │  │  Auth pages           │ │
                         │  │  Dashboard (/dashboard)│ │
                         │  │  Admin (/admin)        │ │
                         │  └───────────────────────┘ │
                         │  ┌───────────────────────┐ │
   Flutter app ─────────▶│  │  REST API (/api/*)    │◀┼──── Anthropic Claude
   (Android/iOS)          │  │  AI orchestration     │ │      (claude-opus-5,
                         │  │  (apps/web/src/ai/*)   │ │       tool use)
                         │  └───────────────────────┘ │
                         └─────────────────────────────┘
```

Everything — the marketing site, the authenticated dashboard, the admin
panel, the AI orchestration layer, and the JSON API consumed by the Flutter
app — is one Next.js application (`apps/web`). There is no separate backend
service: API routes under `src/app/api/**` *are* the backend, and
`src/ai/**` *is* the AI engine (the "ai-engine" layer from the product spec,
living inside the same app rather than a separate microservice).

## Why one Next.js app instead of a separate API + AI service

- Next.js API routes give us serverless-friendly HTTP handlers and React
  Server Components in the same codebase — no duplicated types, no separate
  deploy pipeline for a backend that would just be a thin CRUD + AI-proxy
  layer anyway.
- The AI orchestration layer (`src/ai/orchestrator.ts`, `src/ai/tools.ts`,
  `src/ai/workflow-engine.ts`) calls the same Prisma client as the rest of
  the app directly — no internal HTTP hop between "backend" and "AI engine".
- The Flutter app and the browser hit the exact same endpoints, authenticated
  the same way (see below), so behavior never drifts between clients.
- If the product later needs a dedicated worker (e.g. heavy background
  jobs, a real scheduler for `SCHEDULE`-triggered workflows), the AI
  orchestration functions can be lifted out with minimal change since they
  only depend on `packages/database` and `ANTHROPIC_API_KEY`.

## Monorepo layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js 14 App Router app: pages, API routes, auth, AI orchestration |
| `apps/web/src/ai` | The AI engine: tool implementations, agent router/orchestrator, workflow automation engine |
| `apps/mobile` | Flutter app (Android + iOS) |
| `packages/database` | Prisma schema, generated client, seed script — imported by `apps/web` as `@linqkeun/database` |
| `docs/` | This documentation |

npm workspaces wire `packages/database` into `apps/web` without publishing to
a registry — `apps/web/package.json` depends on `"@linqkeun/database": "*"`.

## Data model

Defined in [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma):

- **User** — email/password (bcrypt) accounts, `role` of `USER` or `ADMIN`.
- **Subscription** — one-to-one with User; currently only tracks a
  `planCode` (`free`/`pro`/`business`) and status. No payment gateway is
  wired yet — this table is the integration point for one later (see
  [DEPLOYMENT.md](DEPLOYMENT.md#adding-payments-later)).
- **Agent** — one of the 5 seeded AI co-workers (or a custom one an admin
  adds). Holds `systemPrompt`, `skills`, `tools` (which functions it may
  call), and admin-editable metadata. See [AI_AGENTS.md](AI_AGENTS.md).
- **Conversation** / **Message** — multi-turn chat history per user per
  agent. `Message.toolCalls` stores which tools an assistant reply used, for
  transparency in the UI.
- **Task** — work items, assignable to an `Agent`, a `User`, both, or
  neither. `result` holds an AI agent's output once it completes a task via
  `POST /api/tasks/:id/run`.
- **WorkflowRule** / **WorkflowRun** — automation rules ("IF trigger THEN
  action") and a log of every time one was evaluated. See
  [AI_AGENTS.md](AI_AGENTS.md#workflow-automation).
- **KnowledgeBaseEntry** — company context (policies, product info, brand
  positioning) fed to agents as retrieval context.
- **BusinessMetric** — monthly KPI time series (revenue, expenses,
  customers, tasksCompleted) backing the dashboard, `/api/reports`, and
  `METRIC_THRESHOLD` workflow triggers.
- **ActivityLog** — audit trail of what users and agents did, shown on the
  dashboard's activity feed.
- **ConnectorAccount** — status/config placeholder for external platform
  integrations (WhatsApp, Email, Google Sheets, CRM).

## Auth

Custom JWT auth (not NextAuth/Clerk), because the same credential scheme
needs to work for both a browser (cookies) and a native mobile app (no
cookie jar by default):

1. `POST /api/auth/register` or `/api/auth/login` hashes/verifies the
   password with `bcryptjs`, then signs a JWT (`jose`, HS256, 30-day
   expiry) containing `sub` (user id), `email`, `role`.
2. The response sets an **httpOnly cookie** (`linqkeun_token`) for the web
   app, *and* returns the same token in the JSON body for the Flutter app to
   store in secure storage (`flutter_secure_storage`) and send back as
   `Authorization: Bearer <token>`.
3. `src/lib/session.ts`'s `requireUser()` / `requireAdmin()` read the token
   from either the cookie or the `Authorization` header (`src/lib/auth.ts:
   extractToken`), verify it, and load the `User` row — so every API route
   works identically for both clients.
4. `src/middleware.ts` adds defense-in-depth by redirecting unauthenticated
   browser requests away from `/dashboard` and `/admin` before the page even
   renders (API routes still independently enforce auth).

## AI engine

See [AI_AGENTS.md](AI_AGENTS.md) for the full design. In short:

- `src/lib/anthropic.ts` — `runWithTools()`, a generic Claude tool-use loop
  (model call → execute any `tool_use` blocks → feed results back → repeat).
  All calls use `claude-opus-5` (do not change this without an explicit
  reason).
- `src/ai/tools.ts` — the real, DB-backed tool implementations
  (`get_business_metrics`, `list_tasks`, `create_task`,
  `search_knowledge_base`).
- `src/ai/orchestrator.ts` — `runAgentTurn()`, the per-agent entry point:
  builds the system prompt (persona + knowledge-base context), wires up the
  agent's allowed tools, and for the CEO agent adds `delegate_to_agent` so it
  can consult specialists and synthesize their answers.
- `src/ai/workflow-engine.ts` — `evaluateAndRunWorkflow()`, the automation
  rule evaluator (trigger check → task creation or agent run).

Three API routes drive the AI engine:

- **`POST /api/ai/chat`** — per-agent conversational chat (persisted).
- **`POST /api/ai/orchestrate`** — forces the CEO agent to consult
  specialists before answering ("ask the whole company").
- **`POST /api/ai/analyze`** — structured, tool-grounded JSON insight for
  the dashboard's AI Insights panel (not a persona chat).

## Admin panel

`/admin` (role-gated by `requireAdmin` + middleware) exposes:

- **Overview** (`/admin`, `GET /api/admin/stats`) — user/task/conversation
  counts, most-active agents.
- **Agents** (`/admin/agents`, `/api/admin/agents*`) — full CRUD over the
  agent roster: edit title/description/system prompt/skills/tools, toggle
  active, create new agents without a deploy.
- **Users** (`/admin/users`, `/api/admin/users`) — list of accounts with
  usage counts.

## Mobile app

The Flutter app (`apps/mobile`) mirrors the web chat experience: an agent
list screen and a chat screen per agent. It talks to the exact same API —
see [MOBILE.md](MOBILE.md).
