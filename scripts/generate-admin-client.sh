#!/bin/bash

set -e

FASTAPI_SERVER_HOST="${FASTAPI_SERVER_HOST:-http://localhost:8000/}"
BACKEND_CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-nexus-backend-1}"
CONTAINER_ID=$(docker ps -qf "name=$BACKEND_CONTAINER_NAME")

cd "$(dirname "$0")/.."

if [ -z "$CONTAINER_ID" ]; then
  echo "Backend server is not running or not found ($BACKEND_CONTAINER_NAME)"
  echo "Trying to download the OpenAPI schema from $FASTAPI_SERVER_HOST"
  curl -sSf -o admin/openapi.json "${FASTAPI_SERVER_HOST}api/v1/openapi.json" || {
    echo "Failed to download OpenAPI schema. Is the backend running?"
    exit 1
  }
else
  echo "Backend container found: $CONTAINER_ID"
  echo "Downloading OpenAPI schema from the backend container"
  docker exec "$CONTAINER_ID" cat /app/openapi.json > admin/openapi.json || {
    echo "Failed to download OpenAPI schema from container."
    exit 1
  }
fi

cd admin
echo "Generating TypeScript client from schema"
npm run generate-client

echo "Admin client successfully generated" 