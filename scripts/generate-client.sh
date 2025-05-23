#!/usr/bin/env bash

# Generate OpenAPI client
# This script generates OpenAPI specifications from a FastAPI application and uses them for frontend client code generation

# Strict mode, exit immediately if any command fails
set -e

# Get the absolute path of the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "🔨 Generating OpenAPI client..."
echo "📍 Script directory: $SCRIPT_DIR"
echo "📍 Project root: $PROJECT_ROOT"
echo "📍 Current directory: $(pwd)"

# Enter the backend directory first
cd "$PROJECT_ROOT/backend"
echo "📍 Changed to backend directory: $(pwd)"

# 显示Python环境信息
echo "🐍 Python environment:"
which python || echo "Python command not found"
python --version || echo "Python version command failed"
echo "🔍 Python path: $PYTHONPATH"
echo "🔍 Python executable: $(which python)"

# 使用 uv 安装必要的依赖
echo "📦 Installing required dependencies with uv..."
uv add --dev sentry_sdk posthog || {
  echo "⚠️ Warning: Failed to install dependencies with uv add"
  echo "⚠️ Trying to sync dependencies..."
  uv sync || {
    echo "❌ Failed to sync dependencies"
    exit 1
  }
}

# 检查依赖项是否安装
echo "📦 Checking for required dependencies..."
uv run python -c "import sys; print('Python version:', sys.version); print('Path:', sys.path)" || {
  echo "❌ Python is not available"
  exit 1
}

# 列出已安装的包
echo "📦 Installed packages:"
uv run python -c "import importlib.util; print('sentry_sdk:', importlib.util.find_spec('sentry_sdk') is not None)"
uv run python -c "import importlib.util; print('posthog:', importlib.util.find_spec('posthog') is not None)"

# 检查是否安装了sentry_sdk
uv run python -c "import sentry_sdk; print('sentry_sdk installed successfully')" || {
  echo "❌ sentry_sdk is not installed or not accessible"
  echo "🔍 Attempting again with explicit uv add..."
  uv add --dev sentry_sdk
  uv run python -c "import sentry_sdk; print('sentry_sdk installed successfully')" || {
    echo "❌ Still cannot import sentry_sdk after reinstall"
    exit 1
  }
}

# 检查是否安装了posthog
uv run python -c "import posthog; print('posthog imported successfully')" || {
  echo "❌ posthog is not installed or not accessible"
  echo "🔍 Attempting again with explicit uv add..."
  uv add --dev posthog
  uv run python -c "import posthog; print('posthog imported successfully')" || {
    echo "❌ Still cannot import posthog after reinstall"
    exit 1
  }
}

echo "✅ Dependencies check passed"

# 生成OpenAPI JSON
echo "📝 Generating OpenAPI JSON..."
uv run python -c "import app.main; import json; print(json.dumps(app.main.app.openapi()))" > "$PROJECT_ROOT/openapi.json" 2> generate-client.log || {
  echo "❌ Failed to generate OpenAPI specification"
  cat generate-client.log
  exit 1
}

# 确保JSON文件内容有效 - 验证第一个字符是 '{'
if [[ $(head -c 1 "$PROJECT_ROOT/openapi.json") != "{" ]]; then
  echo "❌ Generated OpenAPI specification is not valid JSON"
  echo "🔍 Attempting to fix the JSON file..."
  # 查找并保留从第一个 '{' 开始的内容
  sed -i.bak -e '/{/,$!d' "$PROJECT_ROOT/openapi.json"
  # 如果修复后文件不存在或为空，则退出
  if [[ ! -s "$PROJECT_ROOT/openapi.json" ]]; then
    echo "❌ Failed to fix the OpenAPI JSON file"
    exit 1
  fi
  echo "✅ JSON file fixed"
fi

# Move to the frontend directory and generate the client
if [ -f "$PROJECT_ROOT/openapi.json" ]; then
  echo "✅ OpenAPI JSON generated successfully"
  echo "📦 Moving to frontend directory and generating client..."
  mv "$PROJECT_ROOT/openapi.json" "$PROJECT_ROOT/frontend/"
  cd "$PROJECT_ROOT/frontend"
  echo "📍 Changed to frontend directory: $(pwd)"
  
  pnpm run generate-client || {
    echo "❌ Failed to generate client"
    exit 1
  }
  
  echo "🧹 Formatting generated client code..."
  pnpm exec biome format --write ./app/openapi-client || {
    echo "❌ Failed to format client code"
    exit 1
  }
  
  echo "✅ Client generated successfully"
else
  echo "❌ OpenAPI specification file not found"
  exit 1
fi
