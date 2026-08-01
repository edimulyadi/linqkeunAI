# Linqkeun AI

**Linqkeun AI** is an ERP assistant platform where each business function is
represented by an intelligent AI co-worker — **CEO AI**, **Finance AI**,
**HR AI**, **Marketing AI**, and **Operations AI** — inside one ERP:
*ERP + AI Co-Workers + Automation Engine.*

Users can chat with each AI role, assign it work, automate workflows
("IF revenue drops → Marketing AI generates a campaign"), and get
dashboard-level insights and reports — all from one platform. The product
ships as:

- **Backend + AI orchestration + Admin dashboard + Web app** — Next.js 14
  (App Router), one codebase serving the marketing site, the authenticated
  user dashboard, the admin panel, the REST API, and the AI agent engine.
- **Mobile app** — Flutter, targeting Android and iOS, talking to the same
  API (chat with any agent).
- **Database** — PostgreSQL via Prisma, shared by the web app through the
  `packages/database` workspace.
- **AI provider** — Anthropic Claude (`claude-opus-5`), driving real
  tool-use (agents call real functions — business metrics, tasks, knowledge
  base — before answering, and the CEO agent can delegate to specialists).

This is a monorepo (npm workspaces):

```
linqkeunAI/
├── apps/
│   ├── web/            # Next.js app: marketing site, dashboard, admin, API, AI engine
│   │   └── src/ai/      # Agent router, tool implementations, workflow automation engine
│   └── mobile/          # Flutter app (Android + iOS)
├── packages/
│   └── database/        # Prisma schema, generated client, seed script
├── docs/                 # Architecture, API, AI agents, deployment, mobile docs
├── ecosystem.config.js   # PM2 process file for a no-Docker VPS deployment
├── docker-compose.yml    # Optional: local Postgres + web app in containers
├── Dockerfile            # Optional: production container image for apps/web
└── .github/workflows/    # CI
```

## The 5 AI co-workers

| Agent | Role | What it does |
|---|---|---|
| **CEO AI** | Strategic decision-making | Combines Finance/HR/Marketing/Operations insight into one recommendation (delegates via tool use, then synthesizes) |
| **Finance AI** | CFO | Cash flow analysis, revenue forecasting, cost optimization |
| **HR AI** | People ops | Recruitment, performance review, HR policy |
| **Marketing AI** | Growth | Campaign strategy, content, funnel optimization |
| **Operations AI** | Process | Workflow optimization, SOPs, vendor management |

Each agent has a role identity, a system prompt, real callable tools
(business metrics, task management, knowledge-base search), and
per-user/per-agent conversation memory. See
[docs/AI_AGENTS.md](docs/AI_AGENTS.md) for the full design.

## Quick start (local development)

Prerequisites: Node.js ≥ 20, npm, a PostgreSQL database (local Postgres,
Docker, or a hosted instance like Supabase/Neon), and an
[Anthropic API key](https://console.anthropic.com/).

```bash
# 1. Install dependencies (installs all workspaces)
npm install

# 2. Configure environment
cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
npm run setup:env   # symlinks .env into apps/web and packages/database

# 3. Set up the database
npm run db:generate
npm run db:push
npm run db:seed     # seeds the 5 AI agents, sample tasks/metrics/workflow + an admin account

# 4. Run the web app
npm run dev
# → http://localhost:3000
```

Default seeded admin login: `admin@linqkeun.ai` / `ChangeMe123!` (override
via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` before seeding, and
change the password immediately in production).

The seed data includes 6 months of `BusinessMetric` history with a
deliberate revenue drop in the most recent month, plus a
"Peringatan Penurunan Pendapatan" workflow rule — log in, go to
**Settings → Workflow Automation**, and click "Jalankan Sekarang" to see
the automation create a real task for Marketing AI end to end.

### Running with Docker instead (optional)

```bash
docker compose up --build
```

This starts Postgres and the web app together. Run
`npm run db:push && npm run db:seed` once against that database before first
use. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for this and the
recommended no-Docker (Vercel + VPS/PM2) deployment paths.

### Running the mobile app

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3000
```

See [docs/MOBILE.md](docs/MOBILE.md) for Android/iOS build and release
instructions.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, data model, request flow
- [docs/AI_AGENTS.md](docs/AI_AGENTS.md) — agent system design: tools, orchestration, memory, workflow automation
- [docs/API.md](docs/API.md) — full REST API reference
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deploying the web app + database to production (no Docker required)
- [docs/MOBILE.md](docs/MOBILE.md) — building and releasing the Flutter app

## What's real vs. what needs your own credentials

Every agent conversation, task assignment, workflow automation rule, and
report is fully wired and works as soon as you add `ANTHROPIC_API_KEY` — the
tools agents call (business metrics, tasks, knowledge base) all read/write
real Postgres data, and the CEO agent's delegation to specialists is a real
multi-step Claude tool-use flow, not a canned response.

Integrations labeled in Settings (WhatsApp, Email, Google Sheets, CRM) are
scaffolded with a data model (`ConnectorAccount`) and status UI, but
actually connecting to those third-party platforms requires your own API
credentials for each — wiring those is a natural next step. Scheduled
(`SCHEDULE`-triggered) workflow automation needs a cron caller with its own
auth, documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#automation-scheduling);
manually-triggered and `METRIC_THRESHOLD` workflows work today via the
Settings UI without any extra setup.

## License

Proprietary — © Linqkeun AI. All rights reserved.
