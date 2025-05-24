#!/usr/bin/env bash

# Run backend tests with coverage
# This script runs pytest with coverage reporting

# Strict mode, exit immediately if any command fails
set -e

# Get the absolute path of the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "🧪 Running backend tests with coverage..."

# 检查环境变量是否已正确设置
if [ "$TESTING" != "true" ] || [ "$TEST_MODE" != "true" ]; then
  echo "❌ 错误：必须同时设置 TESTING=true 和 TEST_MODE=true 环境变量才能运行测试"
  echo "当前环境变量：TESTING=$TESTING, TEST_MODE=$TEST_MODE"
  exit 1
fi

# 确保设置测试环境变量
export TESTING=true
export TEST_MODE=true

# Enter backend directory
cd "$BACKEND_DIR"

# Set default title for coverage report
TITLE="${@:-coverage}"

# Run tests with coverage
echo "🧪 Running tests with test database..."
TESTING=true TEST_MODE=true coverage run --source=app -m pytest || {
  echo "❌ Tests failed"
  exit 1
}

# Generate coverage report
echo "📊 Generating coverage report..."
coverage report --show-missing || {
  echo "❌ Failed to generate coverage report"
  exit 1
}

# Generate HTML coverage report
echo "📄 Generating HTML coverage report..."
coverage html --title "$TITLE" || {
  echo "❌ Failed to generate HTML coverage report"
  exit 1
}

echo "✅ Tests completed successfully"
