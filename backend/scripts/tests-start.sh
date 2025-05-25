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

# --- Environment Variable Setup ---
CI_ENV=${CI:-false} # Detect CI environment (defaults to false if CI variable is not set)

# Check if TESTING and TEST_MODE are correctly set, or set them in CI
if [ "$TESTING" != "true" ] || [ "$TEST_MODE" != "true" ]; then
  if [ "$CI_ENV" = "true" ]; then
    echo "ℹ️  CI environment detected. Automatically setting TESTING=true and TEST_MODE=true."
    export TESTING=true
    export TEST_MODE=true
  else
    echo "❌ 错误：必须同时设置 TESTING=true 和 TEST_MODE=true 环境变量才能运行测试。"
    echo "   请像这样设置它们: TESTING=true TEST_MODE=true $0"
    echo "   当前环境变量：TESTING=${TESTING:-未定义}, TEST_MODE=${TEST_MODE:-未定义}"
    exit 1
  fi
else
  # If already set by the calling environment, ensure they are exported for sub-processes
  export TESTING
  export TEST_MODE
  echo "ℹ️  使用已设置的环境变量: TESTING=$TESTING, TEST_MODE=$TEST_MODE."
fi

# Force set test-specific superuser credentials
export FIRST_SUPERUSER_PASSWORD=telepace
export FIRST_SUPERUSER=admin@telepace.cc

echo "🔧 Test environment variables configured:"
echo "  TESTING=$TESTING"
echo "  TEST_MODE=$TEST_MODE"
echo "  FIRST_SUPERUSER=$FIRST_SUPERUSER"
echo "  FIRST_SUPERUSER_PASSWORD=*** (sensitive)" # Avoid printing password directly

# --- Database Preparation ---
echo "⚠️  警告：测试将使用独立的测试数据库 (app_test)，任何现有数据将在测试后被删除。"
echo "🗄️  Using dedicated test database 'app_test' for testing."

# 确保测试数据库存在
echo "🔍 检查测试数据库是否已创建..."
# Ensure python can find modules from the app directory
export PYTHONPATH="${PYTHONPATH}:${BACKEND_DIR}"

python -c "from app.tests.utils.test_db import create_test_database; create_test_database()" || {
  echo "❌ 测试数据库创建失败，请检查数据库连接和权限。"
  exit 1
}
echo "✅ 测试数据库已准备就绪。"

# 应用数据库迁移到测试数据库
echo "🔄 应用数据库迁移到测试数据库..."
alembic upgrade head || {
  echo "❌ 测试数据库迁移失败。"
  exit 1
}
echo "✅ 数据库迁移应用成功。"

# 初始化测试数据库的初始数据（超级用户等）
echo "🌱 初始化测试数据库的初始数据..."
python scripts/test-init-data.py || {
  echo "❌ 测试数据库初始数据创建失败。"
  exit 1
}
echo "✅ 测试数据库初始数据创建成功。"

# 初始化额外的测试数据
echo "📋 创建额外的测试数据..."
# The 2>/dev/null suppresses errors if the function is missing, allowing tests to proceed.
# This is kept from the original script, assuming it's intentional.
python -c "from app.tests.utils.test_db import create_test_data; create_test_data()" 2>/dev/null || {
  echo "⚠️  额外测试数据创建可能未完成或失败 (例如，函数 'create_test_data' 可能未定义)。测试将继续。"
}
echo "✅ 额外测试数据步骤完成 (或跳过)。"


# --- Pre-Test Checks & Debugging ---
echo "🏁 Running test pre-start checks..."
python app/tests_pre_start.py || {
  echo "❌ Test environment preparation (pre-start checks) failed."
  exit 1
}
echo "✅ Test pre-start checks Succeeded."

echo "🔍 Debugging test superuser configuration..."
python scripts/test-debug.py || {
  echo "❌ Test superuser configuration verification failed."
  exit 1
}
echo "✅ Test superuser configuration verified."

# --- Run Tests ---
echo "🧪 Running tests..."
# Pass any arguments received by this script to the actual test script
# TESTING and TEST_MODE are already exported, so test.sh will inherit them.
bash "$SCRIPT_DIR/test.sh" "$@" || {
  echo "❌ Tests failed."
  exit 1
}

echo "✅ All tests completed successfully."