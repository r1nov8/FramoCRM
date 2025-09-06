#!/usr/bin/env bash
set -euo pipefail

# Configure Azure Web App health check path to /api/health.
# Requirements:
#  - Azure CLI logged in (az login)
#  - Correct subscription set (az account set --subscription <SUB_ID>)
# Usage:
#  ./scripts/set-healthcheck.sh <resource-group> <app-name>

if [ $# -ne 2 ]; then
  echo "Usage: $0 <resource-group> <app-name>" >&2
  exit 1
fi

RG="$1"
APP="$2"

echo "Setting health check path to /api/health for Web App '$APP' (RG=$RG)..."
az webapp config set \
  --resource-group "$RG" \
  --name "$APP" \
  --generic-configurations '{"healthCheckPath":"/api/health"}'

echo "Done. Verify in Portal > App Service > Health check (should show /api/health)."
