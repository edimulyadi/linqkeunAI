# AI Tool Catalog

linqkeunAI ships 20 AI tools ("karyawan AI") across 4 categories, seeded by
[`packages/database/seed.js`](../packages/database/seed.js). Every tool is a
row in the `AiTool` table — title, description, price, and (most
importantly) `systemPrompt` are all editable from `/admin/tools` without a
code deploy.

## Tool kinds

| `kind` | Behavior | API route | UI |
|---|---|---|---|
| `CONTENT_GENERATION` | One-shot text generation from a free-text brief | `POST /api/ai/generate` | Input textarea → streamed output panel |
| `CHAT_ASSISTANT` | Multi-turn conversation, history persisted | `POST /api/ai/chat` | Chat bubbles UI |
| `LANDING_PAGE` | One-shot generation, output is a full HTML document | `POST /api/ai/generate` (effort: `high`, larger `maxTokens`) | Same as `CONTENT_GENERATION`, plus an iframe preview tab on web |
| `IMAGE_PROMPT` | One-shot generation of a *text brief/prompt* for external image/video tools | `POST /api/ai/generate` | Same as `CONTENT_GENERATION` |
| `CONNECTOR` | Placeholder for a third-party platform integration | `POST /api/ai/generate` (answers using whatever context is available; does not call the external platform) | Same as `CONTENT_GENERATION` |

All AI calls use `claude-opus-5` (see `apps/web/src/lib/anthropic.ts`).

## Catalog

### 1. Karyawan AI — fondasi produktivitas harian
| Code | Tool | Kind |
|---|---|---|
| 1.1 | Asisten Prompting | `CHAT_ASSISTANT` |
| 1.2 | Pabrik Konten Sosial | `CONTENT_GENERATION` |
| 1.3 | Studio Visual AI | `IMAGE_PROMPT` |
| 1.4 | Layanan Pelanggan AI | `CHAT_ASSISTANT` |
| 1.5 | Automasi Tugas Rutin | `CONTENT_GENERATION` |

### 2. Business AI — sambungkan AI ke marketing & channel
| Code | Tool | Kind |
|---|---|---|
| 2.1 | Konektor Iklan | `CONNECTOR` |
| 2.2 | Konten Sosial Multi-Platform | `CONTENT_GENERATION` |
| 2.3 | Kloning Personal Branding | `CONTENT_GENERATION` |
| 2.4 | Generator Produk Digital | `CONTENT_GENERATION` |
| 2.5 | Perancang Value Ladder | `CONTENT_GENERATION` |

### 3. Manager AI — satu AI untuk seluruh organisasi
| Code | Tool | Kind |
|---|---|---|
| 3.1 | Ringkasan Pemakaian Organisasi | `CONTENT_GENERATION` |
| 3.2 | Spesialis AI per Divisi | `CHAT_ASSISTANT` |
| 3.3 | Konektor Platform Perusahaan | `CONNECTOR` |
| 3.4 | Automasi Tugas Berulang Tim | `CONTENT_GENERATION` |
| 3.5 | Generator Tim AI Kustom | `CHAT_ASSISTANT` |

### 4. Vibe Marketing — konten & iklan tanpa tim kreatif besar
| Code | Tool | Kind |
|---|---|---|
| 4.1 | Konten Organik Multi-Platform | `CONTENT_GENERATION` |
| 4.2 | Formula ATM Iklan | `CONTENT_GENERATION` |
| 4.3 | Konektor Pemasangan Iklan | `CONNECTOR` |
| 4.4 | Landing Page 15 Menit | `LANDING_PAGE` |
| 4.5 | Offer & Value Stacking | `CONTENT_GENERATION` |

Full descriptions and system prompts are in `packages/database/seed.js` and
editable per-tool in `/admin/tools`.

## `CONNECTOR` tools need your own platform credentials

`Konektor Iklan`, `Konektor Platform Perusahaan`, and `Konektor Pemasangan
Iklan` are scaffolded (data model: `ConnectorAccount` with `provider`,
`status`, `metadata`) but **do not actually call Meta Ads, Google Ads,
WhatsApp, or accounting APIs yet** — there's no way to ship working
third-party integrations without your own developer accounts and API
credentials for each platform. To wire one up:

1. Register a developer app on the target platform (e.g. Meta for
   Developers for Meta Ads / WhatsApp Business, Google Cloud Console for
   Google Ads) and obtain OAuth credentials.
2. Add an OAuth flow: `GET /api/connectors/:provider/authorize` (redirect to
   the platform) and `GET /api/connectors/:provider/callback` (exchange the
   code, store the token in `ConnectorAccount.metadata`, set
   `status: CONNECTED`).
3. Update the tool's `systemPrompt` (or add a dedicated API route) to pull
   real data from that platform's API using the stored token, and pass it
   into the Claude call as additional context.
4. Update the connector's status card in the dashboard UI to reflect real
   connection state instead of always showing "not connected".

This is scoped out of the initial build because it requires credentials
only you can obtain — everything else (schema, status UI, prompts that
explain the connection requirement to end users) is already in place to
build on top of.

## Adding a new tool

**Without touching code:** log in as an admin, go to `/admin/tools`, and use
the edit panel — today it supports editing existing tools (title,
description, system prompt, price, active toggle). Full "create new tool"
UI can be added by wiring a form to the already-existing
`POST /api/admin/tools` endpoint (see [API.md](API.md#post-apiadmintools)).

**Via the seed script (for catalog changes you want version-controlled):**
add an entry to the relevant category in `packages/database/seed.js`, then
run `npm run db:seed` — the seed is idempotent (upserts by `slug`), so it's
safe to re-run against an existing database.

**System prompt guidelines:** every tool's `systemPrompt` should (1) state
the persona/role clearly, (2) give explicit output format guidance if the
output needs a specific shape (e.g. the `LANDING_PAGE` tool's prompt
requires "return ONLY the HTML"), and (3) tell the model what *not* to
fabricate (prices, stock, legal claims) — see the existing 20 prompts for
the house style.
