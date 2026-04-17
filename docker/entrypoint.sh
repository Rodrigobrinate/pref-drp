#!/bin/sh
set -eu

echo "Syncing Prisma schema..."
npx prisma db push --schema prisma/schema.prisma

echo "Starting Next.js..."
exec node server.js
