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

# 显示Python环境信息
echo "🐍 Python environment:"
which python || echo "Python command not found"
python --version || echo "Python version command failed"
echo "🔍 Python path: $PYTHONPATH"
echo "🔍 Python executable: $(which python)"

# 在进入backend目录之前，确保安装必要的依赖
echo "📦 Installing required dependencies..."
python -m pip install --no-cache-dir sentry_sdk posthog || {
  echo "⚠️ Warning: Failed to install dependencies with python -m pip"
  echo "⚠️ Trying with pip directly..."
  pip install --no-cache-dir sentry_sdk posthog || {
    echo "❌ Failed to install dependencies"
    exit 1
  }
}

# Enter the backend directory and generate OpenAPI JSON
cd "$PROJECT_ROOT/backend"
echo "📍 Changed to backend directory: $(pwd)"

# 安装后端依赖
echo "📦 Installing backend dependencies..."
python -m pip install . || {
  echo "❌ Failed to install backend dependencies using pip install ."
  # Fallback to requirements.txt if it exists, though pyproject.toml is preferred
  if [ -f "requirements.txt" ]; then
    echo "📦 Trying pip install -r requirements.txt..."
    python -m pip install -r requirements.txt || {
      echo "❌ Failed to install backend dependencies from requirements.txt"
      exit 1
    }
  else
    exit 1
  fi
}
echo "✅ Backend dependencies installed."

# 检查依赖项是否安装
echo "📦 Checking for required dependencies..."
python -c "import sys; print('Python version:', sys.version); print('Path:', sys.path)" || {
  echo "❌ Python is not available"
  exit 1
}

# 列出已安装的包
echo "📦 Installed packages:"
pip list | grep sentry || echo "sentry_sdk not found in pip list"
pip list | grep posthog || echo "posthog not found in pip list"

# 检查是否安装了sentry_sdk
python -c "import sentry_sdk; print('sentry_sdk installed successfully')" || {
  echo "❌ sentry_sdk is not installed or not accessible"
  echo "🔍 Attempting again with explicit pip install..."
  python -m pip install --verbose --no-cache-dir sentry_sdk
  python -c "import sentry_sdk; print('sentry_sdk installed successfully')" || {
    echo "❌ Still cannot import sentry_sdk after reinstall"
    exit 1
  }
}

# 检查是否安装了posthog
python -c "import posthog; print('posthog imported successfully')" || {
  echo "❌ posthog is not installed or not accessible"
  echo "🔍 Attempting again with explicit pip install..."
  python -m pip install --verbose --no-cache-dir posthog
  python -c "import posthog; print('posthog imported successfully')" || {
    echo "❌ Still cannot import posthog after reinstall"
    exit 1
  }
}

echo "✅ Dependencies check passed"

# 生成OpenAPI JSON
echo "📝 Generating OpenAPI JSON..."
# Set required environment variables for OpenAPI generation
# A valid Fernet key is 32 bytes, URL-safe base64 encoded.
export APP_SYMMETRIC_ENCRYPTION_KEY="cw_2xL3n14u9k29SMTFb7yYJ3jS2pLp4o7TjV_hC_rU="
export SENTRY_DSN="" # Optional, provide dummy if strictly required
export POSTHOG_API_KEY="" # Optional, provide dummy if strictly required

python -c "import app.main; import json; print(json.dumps(app.main.app.openapi()))" > "$PROJECT_ROOT/openapi.json" 2> generate-client.log || {
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

  echo "📦 Installing frontend dependencies..."
  pnpm install || {
    echo "❌ Failed to install frontend dependencies"
    exit 1
  }
  echo "✅ Frontend dependencies installed."
  
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
