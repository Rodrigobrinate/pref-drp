#!/bin/sh
set -eu

if [ "${PRISMA_DB_PUSH_ON_START:-false}" = "true" ]; then
  echo "Syncing Prisma schema..."
  npx prisma db push --schema prisma/schema.prisma
fi

if [ "${RUN_SEED_ON_START:-false}" = "true" ]; then
  echo "Running seed..."
  npx prisma db seed
fi

echo "Starting Next.js..."
exec node server.js
