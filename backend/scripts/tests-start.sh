#!/usr/bin/env bash

# Start backend tests
# This script prepares the environment and runs tests

# Strict mode, exit immediately if any command fails
set -e

# Get the absolute path of the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "🔧 Preparing test environment..."

# Enter backend directory
cd "$BACKEND_DIR"

# 检测 CI 环境
CI_ENV=${CI:-false}

# 检查环境变量是否已正确设置
if [ "$TESTING" != "true" ] || [ "$TEST_MODE" != "true" ]; then
  if [ "$CI_ENV" = "true" ]; then
    echo "⚠️  CI 环境检测到，自动设置测试环境变量"
    export TESTING=true
    export TEST_MODE=true
  else
    echo "❌ 错误：必须同时设置 TESTING=true 和 TEST_MODE=true 环境变量才能运行测试"
    echo "当前环境变量：TESTING=$TESTING, TEST_MODE=$TEST_MODE"
    exit 1
  fi
fi

# 确保设置测试环境变量
export TESTING=true
export TEST_MODE=true

# 打印警告信息
echo "⚠️  警告：测试将使用独立的测试数据库，任何数据将在测试后被删除"
echo "⚠️  测试数据库名称: app_test"

# Print database information
echo "🗄️  Using dedicated test database for testing"

# Initialize test environment
echo "🏁 Running test pre-start checks..."
python app/tests_pre_start.py || {
  echo "❌ Test environment preparation failed"
  exit 1
}

# Run the test script
echo "🧪 Running tests..."
# Pass the testing flag to the test script
TESTING=true TEST_MODE=true bash "$SCRIPT_DIR/test.sh" "$@" || {
  echo "❌ Tests failed"
  exit 1
}

echo "✅ All tests completed successfully"
