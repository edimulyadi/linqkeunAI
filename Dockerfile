# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /repo
RUN apk add --no-cache libc6-compat openssl

# ---- deps: install all workspace dependencies -----------------------------
FROM base AS deps
COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm install --workspaces --include-workspace-root

# ---- build: generate prisma client + build the Next.js app ----------------
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages/database/node_modules ./packages/database/node_modules
COPY . .
RUN npm run db:generate
RUN npm run build --workspace=apps/web

# ---- runtime: minimal image with the standalone Next.js server ------------
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
COPY --from=build /repo/packages/database/generated ./packages/database/generated
COPY --from=build /repo/packages/database/prisma ./packages/database/prisma

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
