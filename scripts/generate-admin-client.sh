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

# 检查node_modules目录是否存在，如果不存在则安装依赖
if [ ! -d "node_modules" ]; then
  echo "⚠️ node_modules directory not found in admin directory"
  echo "📦 Installing dependencies..."
  pnpm install || {
    echo "❌ Failed to install dependencies with pnpm"
    exit 1
  }
  echo "✅ Dependencies installed successfully"
fi

pnpm run generate-client || {
  echo "❌ Failed to generate client"
  exit 1
}

echo "🧹 Formatting generated client code..."
pnpm exec biome format --write ./src/client || {
  echo "❌ Failed to format client code"
  # 不要立即退出，继续执行
}

# 执行修复脚本
echo "🛠️ 修复客户端代码..."
"$PROJECT_ROOT/scripts/fix-admin-client.sh"

echo "Admin client successfully generated" 