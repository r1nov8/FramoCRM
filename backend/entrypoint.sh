#!/bin/bash
set -e

# Wait for Postgres to be ready
# Wait for Postgres to be ready
until PGPASSWORD=crmpassword psql -h db -U crmuser -d crmdb -c '\q' 2>/dev/null; do
  echo "Waiting for postgres..."
  sleep 2
done

# Run migrations (init.sql)
psql -h db -U crmuser -d crmdb -f /app/init.sql

# Start the backend
npm run dev
