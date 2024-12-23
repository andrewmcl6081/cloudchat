#!/bin/sh

# Log the start of the setup process
echo "=== Starting application setup ==="

# Check if DATABASE_URL is set
echo "Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Apply Prisma migrations
echo "Applying Prisma Migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting application..."
npx tsx app/server/index.ts
