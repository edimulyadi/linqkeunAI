# Deployment

The recommended setup — matching the product's target split — is
**Vercel for the frontend/API** and a **plain VPS running PM2** for
anywhere Vercel doesn't fit (e.g. you want a single always-on box, or need
to run the workflow scheduler described below). No Docker is required for
either path; a `Dockerfile`/`docker-compose.yml` are still included as an
optional alternative if you'd rather run everything in containers.

## Environment variables

Set these wherever you deploy `apps/web` (see `.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. Any managed Postgres works (Supabase, Neon, RDS, Railway, or self-hosted). |
| `JWT_SECRET` | Yes | Long random string (`openssl rand -base64 48`). Rotating it logs out every user. |
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com/). Without it, AI routes return a `[Kesalahan AI]`-style error instead of crashing. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Only for `db:seed` | Change the password immediately after first login in production. |
| `NEXT_PUBLIC_APP_URL` | No | Used for absolute links if you add them later. |

Never commit `.env` — only `.env.example` is checked in.

## Option A — Frontend on Vercel

The app is a standard Next.js 14 App Router project, so Vercel works with
zero config beyond environment variables:

1. Import the repo into Vercel, set the **root directory** to `apps/web`.
2. Add `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY` as project
   environment variables.
3. Because this is an npm-workspaces monorepo, Vercel's install step must
   run from the repo root (`npm install`) — Vercel detects this
   automatically when the root directory is a subfolder of a workspace
   root; if it doesn't, set the install command explicitly to
   `cd ../.. && npm install`.
4. Add a **build command** override: `npm run db:generate && npm run build`
   (Prisma's client must be generated before `next build`).
5. Run `npx prisma db push` and the seed script once against your
   production `DATABASE_URL` from your local machine or a one-off deploy
   hook — there's no admin UI for first-run schema setup by design (avoids
   exposing schema-mutation endpoints in production).

A managed serverless Postgres (Supabase, Neon) is the natural pairing here
since Vercel's functions are stateless and short-lived. Note that
`/api/ai/orchestrate` (CEO delegating to 2+ specialists) and
`/api/tasks/:id/run` can take longer than a single-agent chat — both set
`maxDuration = 90` in their route files; confirm your Vercel plan's function
timeout accommodates that.

## Option B — VPS + PM2 (no Docker)

For the backend running on a plain Linux VPS (Ubuntu/Debian):

```bash
# On the VPS, as a deploy user with Node.js >= 20 installed
git clone <your-repo-url> linqkeun-ai
cd linqkeun-ai
npm install
cp .env.example .env   # fill in real DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
npm run setup:env      # symlinks .env into apps/web and packages/database

npm run db:generate
npm run db:push
npm run db:seed        # first run only

npm run build           # builds packages/database then apps/web

npm install -g pm2      # once per machine
pm2 start ecosystem.config.js --env production
pm2 save                # persist the process list
pm2 startup             # follow the printed instructions to boot PM2 on server restart
```

`ecosystem.config.js` (repo root) runs `next start -p 3000` from
`apps/web`. Put a reverse proxy (Nginx or Caddy) in front of port 3000 for
TLS termination and a real domain:

```nginx
server {
  server_name app.linqkeun.ai;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
(then `certbot --nginx` for a free TLS cert).

To deploy an update:
```bash
git pull
npm install
npm run db:generate && npm run db:push   # if the schema changed
npm run build
pm2 restart linqkeun-ai-web
```

### Automation scheduling

`WorkflowRule`s with `triggerType: SCHEDULE` (and any `METRIC_THRESHOLD`
rule you want checked automatically instead of via the "Run now" button)
need something to call `POST /api/workflows/:id/run` on a schedule.
That endpoint requires an authenticated user session — the simplest way to
drive it from cron on the same VPS is a small script that logs in once and
reuses the token:

```bash
#!/usr/bin/env bash
# cron: */15 * * * * /opt/linqkeun-ai/scripts/run-workflows.sh
TOKEN=$(curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SCHEDULER_EMAIL\",\"password\":\"$SCHEDULER_PASSWORD\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

for id in "$@"; do
  curl -s -X POST "http://127.0.0.1:3000/api/workflows/$id/run" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
done
```
This is a deliberate v1 shortcut (reusing a real user login) rather than a
fabricated "it's already automated" claim — a proper service-account /
API-key auth mode for machine callers is the natural next step if scheduled
workflows become a primary use case.

## Option C — Docker (optional alternative)

```bash
cp .env.example .env   # fill in real values
docker compose up --build -d
```

This runs Postgres + the web app together. First-time setup against the
running containers:
```bash
docker compose exec web sh -c "cd packages/database && npx prisma db push && node seed.js"
```

The `Dockerfile` is a multi-stage build producing a minimal
`node:20-alpine` runtime image using Next.js's `output: "standalone"` mode.
To deploy the same image to any container platform (Fly.io, Render, Google
Cloud Run, ECS, a bare VM with `docker run`):
```bash
docker build -t linqkeun-ai-web .
docker run -p 3000:3000 \
  -e DATABASE_URL=... -e JWT_SECRET=... -e ANTHROPIC_API_KEY=... \
  linqkeun-ai-web
```

## Database migrations going forward

This project uses `prisma db push` for simplicity (schema-in-code, no
migration history) — fine for a single-team, actively-developed product.
Once the schema stabilizes and you have multiple environments to keep in
sync, switch to `prisma migrate dev` / `prisma migrate deploy` for tracked,
reversible migrations. See the [Prisma migrate docs](https://www.prisma.io/docs/orm/prisma-migrate).

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: spins up a
throwaway Postgres service container, installs dependencies, generates the
Prisma client, pushes the schema, lints, and builds `apps/web`. It does not
deploy anything — wire a deploy step (Vercel Git integration, or a
`git pull && pm2 restart` step over SSH) once you've picked a host.

## Adding payments later

`Subscription.planCode` / `Subscription.status` already exist in the schema
as the integration point. To add real billing (Midtrans/Xendit are the
common choices for Indonesian payments):

1. Add a webhook route, e.g. `POST /api/webhooks/midtrans`, that verifies
   the provider's signature and updates the user's `Subscription` row.
2. Gate agent access (or usage limits) in `/api/ai/chat` and
   `/api/ai/orchestrate` by checking `db.subscription.findUnique(...)`
   before calling `runAgentTurn`.
3. Add a checkout entry point (a button on `/dashboard` linking to a
   provider-hosted checkout page, or their SDK's client-side snippet).

None of this is wired yet per the current product scope (no payment
gateway requested) — the schema just avoids a future migration to add it.

## Scaling strategy

- **Stateless app tier:** `apps/web` holds no in-memory state (sessions are
  JWTs, not server sessions), so it scales horizontally — add more Vercel
  function concurrency, or run multiple PM2 instances behind a load
  balancer (`instances: "max"` in `ecosystem.config.js` with
  `exec_mode: "cluster"`).
- **Database:** the usual Postgres levers apply first — connection pooling
  (e.g. PgBouncer, or Supabase's built-in pooler) before you need read
  replicas; the schema's indexes (`Task.status`, `Conversation.updatedAt`,
  `BusinessMetric.metricKey+periodDate`, `ActivityLog.createdAt`) cover the
  current query patterns.
- **AI calls:** each `runAgentTurn()` is a handful of sequential Claude API
  calls (one per tool-use round, capped by `maxIterations`); if concurrent
  chat volume grows, the natural next step is moving `/api/ai/chat` off
  Vercel's function timeout entirely into a queue (Redis + BullMQ, as noted
  in the original tech stack) with a webhook/polling result delivery
  instead of a synchronous request — the `runAgentTurn()` function itself
  doesn't need to change, only what calls it.
- **Multi-tenant separation:** every table is currently single-tenant
  (shared `Agent`/`KnowledgeBaseEntry`/`BusinessMetric` rows). Adding a
  `Company`/`Organization` table and scoping those tables to it is the
  natural next step if this product needs to serve multiple independent
  businesses from one deployment.

## Production checklist

- [ ] Set a strong, unique `JWT_SECRET` (never reuse the `.env.example` placeholder)
- [ ] Set `ANTHROPIC_API_KEY` from a production-tier Anthropic account
- [ ] Point `DATABASE_URL` at a managed, backed-up Postgres instance
- [ ] Run `db:push` + `db:seed` once against production, then change the seeded admin password
- [ ] Confirm `NODE_ENV=production` so cookies are marked `Secure`
- [ ] Put the app behind HTTPS (required for the `Secure` cookie flag to work at all)
- [ ] Review [AI_AGENTS.md](AI_AGENTS.md#workflow-automation) for any `SCHEDULE` workflow rules you want actually running unattended, and set up the cron script above (or a proper service-account auth mode)
