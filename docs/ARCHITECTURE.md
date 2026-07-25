# Architecture

## Overview

```
                         ┌─────────────────────────┐
                         │        Postgres          │
                         │  (users, tools, chats,   │
                         │   generations, ...)       │
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
   (Android/iOS)          │  └───────────────────────┘ │      (claude-opus-5)
                         └─────────────────────────────┘
```

Everything — the marketing site, the authenticated dashboard, the admin
panel, and the JSON API consumed by the Flutter app — is one Next.js
application (`apps/web`). There is no separate backend service: API routes
under `src/app/api/**` *are* the backend.

## Why one Next.js app instead of a separate API service

- Next.js API routes give us serverless-friendly HTTP handlers, streaming
  responses (`ReadableStream`), and React Server Components in the same
  codebase — no duplicated types, no separate deploy pipeline for a "backend"
  that would just be a thin CRUD + AI-proxy layer anyway.
- The Flutter app and the browser hit the exact same endpoints, authenticated
  the same way (see below), so behavior never drifts between clients.
- If the product later needs a dedicated backend (e.g. heavy background
  jobs), the API routes can be lifted out with minimal change since they
  already only depend on `packages/database` and `ANTHROPIC_API_KEY`.

## Monorepo layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js 14 App Router app: pages, API routes, auth, AI integration |
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
- **Category** — the 4 sessions (Karyawan AI, Business AI, Manager AI, Vibe
  Marketing).
- **AiTool** — one of the 20 seeded tools. Holds the `systemPrompt` sent to
  Claude, a `kind` (`CONTENT_GENERATION`, `CHAT_ASSISTANT`, `LANDING_PAGE`,
  `IMAGE_PROMPT`, `CONNECTOR`), and admin-editable metadata (title,
  description, price, active flag).
- **Generation** — one row per single-shot AI call (input, output, token
  usage), for usage analytics.
- **Conversation** / **Message** — multi-turn history for `CHAT_ASSISTANT`
  tools.
- **ConnectorAccount** — status/config placeholder for external platform
  integrations (Meta Ads, Google Ads, WhatsApp, accounting software).

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

## AI generation pipeline

`src/lib/anthropic.ts` wraps `@anthropic-ai/sdk`. All calls use
`claude-opus-5` (do not change this without an explicit reason — see the
Claude API skill notes in the codebase) and `output_config.effort` tuned per
tool kind (`high` for `LANDING_PAGE`, `medium` otherwise).

Two API routes drive it:

- **`POST /api/ai/generate`** — single-shot generation for
  `CONTENT_GENERATION` / `LANDING_PAGE` / `IMAGE_PROMPT` tools. Streams
  Claude's text back to the client as a raw `text/plain` stream (no SSE
  framing needed — both the browser `fetch` reader and Flutter's
  `http.Client().send()` consume it directly), then persists a `Generation`
  row once the stream finishes.
- **`POST /api/ai/chat`** — multi-turn conversation for `CHAT_ASSISTANT`
  tools. Loads (or creates) a `Conversation`, replays its `Message` history
  as context, streams the reply the same way, then persists both the user
  message and the assistant reply.

Both routes consume the Anthropic SDK's raw async-iterator event stream
(`for await (const event of apiStream)`) rather than mixing `.on()`
listeners with `.finalMessage()` — the latter combination has a known SDK
state-machine bug when a request fails before any content arrives (e.g. an
invalid API key), so this codebase deliberately avoids it.

## Admin panel

`/admin` (role-gated by `requireAdmin` + middleware) exposes:

- **Overview** (`/admin`, `GET /api/admin/stats`) — user/generation/
  conversation counts, most-used tools.
- **Tools** (`/admin/tools`, `/api/admin/tools*`) — full CRUD over the AI
  tool catalog: edit title/description/system prompt/price, toggle active,
  create new tools without a deploy.
- **Users** (`/admin/users`, `/api/admin/users`) — list of accounts with
  usage counts.

## Mobile app

The Flutter app (`apps/mobile`) mirrors the web dashboard: a tool catalog
screen, a generic "runner" screen for single-shot tools, a chat screen for
conversational tools, and a profile screen. It talks to the exact same API
— see [MOBILE.md](MOBILE.md).
