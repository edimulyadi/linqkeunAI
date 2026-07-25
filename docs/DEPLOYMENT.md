# Deployment

## Environment variables

Set these wherever you deploy `apps/web` (see `.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. Any managed Postgres works (Supabase, Neon, RDS, Railway, or self-hosted). |
| `JWT_SECRET` | Yes | Long random string (`openssl rand -base64 48`). Rotating it logs out every user. |
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com/). Without it, AI routes stream a `[Kesalahan AI]` message instead of crashing. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Only for `db:seed` | Change the password immediately after first login in production. |
| `NEXT_PUBLIC_APP_URL` | No | Used for absolute links if you add them later. |

Never commit `.env` — only `.env.example` is checked in.

## Option A — Docker (single VM / any container host)

```bash
cp .env.example .env   # fill in real values
docker compose up --build -d
```

This runs Postgres + the web app together. `docker-compose.yml` maps the web
container's `DATABASE_URL` to the bundled Postgres automatically; only
`JWT_SECRET` and `ANTHROPIC_API_KEY` need to be exported in your shell (or
put in a `.env` file next to `docker-compose.yml`, which Compose reads
automatically for variable substitution).

First-time setup against the running containers:
```bash
docker compose exec web sh -c "cd packages/database && npx prisma db push && node seed.js"
```

The `Dockerfile` is a multi-stage build producing a minimal
`node:20-alpine` runtime image using Next.js's `output: "standalone"` mode —
no dev dependencies or source maps ship in the final image.

To deploy the same image to any container platform (Fly.io, Render, Google
Cloud Run, ECS, a bare VM with `docker run`), build and push it:
```bash
docker build -t linqkeun-ai-web .
docker run -p 3000:3000 \
  -e DATABASE_URL=... -e JWT_SECRET=... -e ANTHROPIC_API_KEY=... \
  linqkeun-ai-web
```

## Option B — Vercel (or any Next.js-native host)

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
   production `DATABASE_URL` from your local machine or a one-off Vercel
   deploy hook — there's no admin UI for first-run schema setup by design
   (avoids exposing schema-mutation endpoints in production).

A managed serverless Postgres (Supabase, Neon) is the natural pairing here
since Vercel's functions are stateless and short-lived; the Anthropic
streaming responses run comfortably within Vercel's function timeout for
typical tool outputs.

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
`docker build && docker push` step) once you've picked a host.

## Adding payments later

`Subscription.planCode` / `Subscription.status` already exist in the schema
as the integration point. To add real billing (Midtrans/Xendit are the
common choices for Indonesian payments):

1. Add a webhook route, e.g. `POST /api/webhooks/midtrans`, that verifies
   the provider's signature and updates the user's `Subscription` row.
2. Gate tool access (or generation limits) in `/api/ai/generate` and
   `/api/ai/chat` by checking `db.subscription.findUnique(...)` before
   calling Claude.
3. Add a checkout entry point (a button on `/dashboard` linking to a
   provider-hosted checkout page, or their SDK's client-side snippet).

None of this is wired yet per the current product scope (no payment
gateway requested) — the schema just avoids a future migration to add it.

## Production checklist

- [ ] Set a strong, unique `JWT_SECRET` (never reuse the `.env.example` placeholder)
- [ ] Set `ANTHROPIC_API_KEY` from a production-tier Anthropic account
- [ ] Point `DATABASE_URL` at a managed, backed-up Postgres instance
- [ ] Run `db:push` + `db:seed` once against production, then change the seeded admin password
- [ ] Confirm `NODE_ENV=production` so cookies are marked `Secure`
- [ ] Put the app behind HTTPS (required for the `Secure` cookie flag to work at all)
- [ ] Review `docs/AI_TOOLS.md` for any `CONNECTOR` tools you want to actually wire up (Meta/Google Ads, WhatsApp, accounting) — each needs its own OAuth credentials from that platform
