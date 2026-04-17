#!/bin/sh
set -eu

echo "Syncing Prisma schema..."
npx prisma db push --schema prisma/schema.prisma

if [ "${RUN_SEED_ON_START:-false}" = "true" ]; then
  echo "Running seed..."
  npx prisma db seed
fi

echo "Starting Next.js..."
exec node server.js
