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

# 确保设置测试环境变量
export TESTING=true
export TEST_MODE=true

# 强制设置测试用的超级用户密码，确保与测试期望一致
export FIRST_SUPERUSER_PASSWORD=telepace
export FIRST_SUPERUSER=admin@example.com

echo "🔧 Test environment variables:"
echo "  TESTING=$TESTING"
echo "  TEST_MODE=$TEST_MODE"
echo "  FIRST_SUPERUSER=$FIRST_SUPERUSER"
echo "  FIRST_SUPERUSER_PASSWORD=***"

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


# 打印警告信息
echo "⚠️  警告：测试将使用独立的测试数据库，任何数据将在测试后被删除"
echo "⚠️  测试数据库名称: app_test"

# Print database information
echo "🗄️  Using dedicated test database for testing"

# 确保测试数据库存在
echo "🔍 检查测试数据库是否已创建..."
python -c "from app.tests.utils.test_db import create_test_database; create_test_database()" || {
  echo "❌ 测试数据库创建失败，请检查数据库连接和权限"
  exit 1
}
echo "✅ 测试数据库已准备就绪"

# 应用数据库迁移到测试数据库
echo "🔄 应用数据库迁移到测试数据库..."
TESTING=true TEST_MODE=true alembic upgrade head || {
  echo "❌ 测试数据库迁移失败"
  exit 1
}
echo "✅ 数据库迁移应用成功"

# 初始化测试数据库的初始数据（超级用户等）
echo "🌱 初始化测试数据库的初始数据..."
TESTING=true TEST_MODE=true python scripts/test-init-data.py || {
  echo "❌ 测试数据库初始数据创建失败"
  exit 1
}
echo "✅ 测试数据库初始数据创建成功"

# 初始化额外的测试数据
echo "📋 创建额外的测试数据..."
TESTING=true TEST_MODE=true python -c "from app.tests.utils.test_db import create_test_data; create_test_data()" 2>/dev/null || {
  echo "⚠️ 额外测试数据创建可能未完成，但将继续测试（可能缺少相应函数）"
}

# Initialize test environment
echo "🏁 Running test pre-start checks..."
python app/tests_pre_start.py || {
  echo "❌ Test environment preparation failed"
  exit 1
}

# Debug test superuser configuration
echo "🔍 Debugging test superuser configuration..."
TESTING=true TEST_MODE=true python scripts/test-debug.py || {
  echo "❌ Test superuser configuration verification failed"
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
