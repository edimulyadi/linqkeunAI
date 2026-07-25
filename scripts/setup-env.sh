#!/usr/bin/env bash
# Symlinks the root .env into every workspace that needs it (Next.js and
# Prisma each resolve .env relative to their own package directory).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env found at project root. Run: cp .env.example .env"
  exit 1
fi

ln -sf ../../.env apps/web/.env
ln -sf ../../.env packages/database/.env

echo "Linked .env into apps/web/.env and packages/database/.env"
