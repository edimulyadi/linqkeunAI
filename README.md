# linqkeunAI

**linqkeunAI** is a full-stack "AI employees" platform: 20 purpose-built AI
tools (karyawan AI) grouped into 4 categories — Karyawan AI, Business AI,
Manager AI, and Vibe Marketing — covering content generation, customer
service, landing pages, and more. The product ships as:

- **Backend + Admin dashboard + Web app** — Next.js 14 (App Router), one
  codebase serving the marketing site, the authenticated user dashboard, the
  admin panel, and the REST API.
- **Mobile app** — Flutter, targeting Android and iOS, talking to the same
  API.
- **Database** — PostgreSQL via Prisma, shared by the web app through the
  `packages/database` workspace.
- **AI provider** — Anthropic Claude (`claude-opus-5`), streamed to both web
  and mobile clients.

This is a monorepo (npm workspaces):

```
linqkeunAI/
├── apps/
│   ├── web/            # Next.js app: marketing site, dashboard, admin, API
│   └── mobile/          # Flutter app (Android + iOS)
├── packages/
│   └── database/        # Prisma schema, generated client, seed script
├── docs/                 # Architecture, API, deployment, mobile docs
├── docker-compose.yml    # Local Postgres + web app
├── Dockerfile            # Production image for apps/web
└── .github/workflows/    # CI
```

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
npm run db:seed     # seeds the 20-tool catalog + an admin account

# 4. Run the web app
npm run dev
# → http://localhost:3000
```

Default seeded admin login: `admin@linqkeun.ai` / `ChangeMe123!` (override
via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` before seeding, and
change the password immediately in production).

### Running with Docker instead

```bash
docker compose up --build
```

This starts Postgres and the web app together. Run
`npm run db:push && npm run db:seed` once against that database before first
use (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

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
- [docs/API.md](docs/API.md) — full REST API reference
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — deploying the web app + database to production
- [docs/MOBILE.md](docs/MOBILE.md) — building and releasing the Flutter app
- [docs/AI_TOOLS.md](docs/AI_TOOLS.md) — the 20-tool catalog and how to add more

## What's real vs. what needs your own credentials

Every tool that is pure text generation (content, copywriting, landing
pages, chat assistants) is **fully wired** to Claude and works as soon as you
add `ANTHROPIC_API_KEY`. Tools labeled `CONNECTOR` (Meta/Google Ads, WhatsApp,
accounting platforms) are scaffolded with a data model and status UI, but
actually posting to those third-party platforms requires your own API
credentials for each platform — wiring those is a natural next step and is
called out explicitly in [docs/AI_TOOLS.md](docs/AI_TOOLS.md).

## License

Proprietary — © linqkeunAI. All rights reserved.
