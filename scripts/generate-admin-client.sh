#!/bin/bash

set -e

FASTAPI_SERVER_HOST="${FASTAPI_SERVER_HOST:-http://localhost:8000/}"
BACKEND_CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-nexus-backend-1}"
CONTAINER_ID=$(docker ps -qf "name=$BACKEND_CONTAINER_NAME")
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

cd "$(dirname "$0")/.."

# 如果前端目录中已经有了 OpenAPI JSON 文件，就直接使用它
if [ -f "$PROJECT_ROOT/frontend/openapi.json" ]; then
  echo "Found existing OpenAPI JSON file in frontend directory, using it for admin client"
  cp "$PROJECT_ROOT/frontend/openapi.json" "$PROJECT_ROOT/admin/openapi.json"
elif [ -z "$CONTAINER_ID" ]; then
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
pnpm run generate-client

echo "🧹 Formatting generated client code..."
pnpm exec biome format --write ./src/client || {
  echo "❌ Failed to format client code"
  # 不要立即退出，继续执行
}

echo "Admin client successfully generated" 