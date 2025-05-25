#!/usr/bin/env bash

# Run backend tests with coverage
# This script runs pytest with coverage reporting

# Strict mode: exit immediately if any command fails or an unset variable is used.
set -euo pipefail

# Get the absolute path of the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧪 Running backend tests with coverage..."

# --- Environment Variable Setup ---
# Check if running in a CI environment
CI_ENV=${CI:-false}

# Ensure TESTING and TEST_MODE are set.
# In CI, default them to true if not set. Otherwise, error out.
if [[ "${TESTING:-false}" != "true" || "${TEST_MODE:-false}" != "true" ]]; then
  if [[ "$CI_ENV" == "true" ]]; then
    echo "⚠️ CI environment detected. Automatically setting TESTING=true and TEST_MODE=true."
    export TESTING=true
    export TEST_MODE=true
  else
    echo "❌ Error: TESTING=true and TEST_MODE=true environment variables must be set to run tests."
    echo "   Current values: TESTING=${TESTING:-not set}, TEST_MODE=${TEST_MODE:-not set}"
    exit 1
  fi
fi
# Re-export to ensure they are available to subprocesses even if set before script execution
export TESTING
export TEST_MODE

# --- Directory Navigation ---
cd "$BACKEND_DIR" || { echo "❌ Error: Failed to change directory to $BACKEND_DIR"; exit 1; }

# --- CI Environment Information ---
if [[ "$CI_ENV" == "true" ]]; then
    echo "🤖 Running in CI environment"
    echo "📊 System resources:"
    # Provide default 'N/A' if commands fail or output is empty
    mem_info=$(free -h | grep '^Mem:' | awk '{print $2}')
    cpu_cores=$(nproc 2>/dev/null)
    disk_space=$(df -h . | tail -1 | awk '{print $4}')

    echo "  Memory: ${mem_info:-N/A}"
    echo "  CPU cores: ${cpu_cores:-N/A}"
    echo "  Disk space: ${disk_space:-N/A}"
fi

# --- Database Connectivity Test ---
echo "🔍 Testing database connectivity..."
if ! python -c "
import os
import sys
from sqlalchemy import create_engine, text
# It's good practice to handle potential import errors for custom modules
try:
    from app.core.config import settings
except ImportError:
    print('❌ Error: Could not import app.core.config.settings. Ensure PYTHONPATH is set correctly.')
    sys.exit(1)

try:
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
        print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    sys.exit(1)
"; then
    echo "❌ Database connectivity check script failed."
    exit 1
fi

# --- Test Execution ---
# Set default title for coverage report, allowing override from command line arguments
TITLE="${1:-Backend Coverage}" # Changed default title to be more descriptive

# Function to run tests with better error handling
run_tests() {
    local test_args="$1"
    echo "🚀 Running tests with arguments: ${test_args:-<none>}"

    # Ensure TESTING is true for the coverage run context
    # The `coverage run` command itself will inherit TESTING from the environment.
    # No need to prepend `TESTING=true` if already exported.
    if coverage run --source=app -m pytest \
        --tb=short \
        --maxfail=10 \
        --durations=10 \
        -v \
        $test_args; then
        echo "✅ Tests passed."
        return 0
    else
        echo "❌ Tests failed or timed out."
        return 1
    fi
}

# --- Main Test and Reporting Logic ---
if run_tests "${@:2}"; then # Pass all arguments except the first (which is title)
    echo "🎉 All tests passed successfully!"

    echo "📊 Generating coverage report..."
    if ! coverage report --show-missing; then
        echo "⚠️ Warning: Failed to generate text coverage report, but tests passed."
        # Decide if this should be a fatal error. For now, it's a warning.
    fi

    echo "📄 Generating HTML coverage report..."
    if ! coverage html --title "$TITLE"; then
        echo "⚠️ Warning: Failed to generate HTML coverage report, but tests passed."
    fi

    echo "✅ Script completed successfully."
    exit 0
else
    echo "🛑 Tests failed."
    echo "📊 Generating partial coverage report (if possible)..."
    # Attempt to generate report even on failure, but don't fail script if this step fails
    coverage report --show-missing || echo "ℹ️  Could not generate partial text coverage report."
    coverage html --title "$TITLE (Partial - Tests Failed)" || echo "ℹ️  Could not generate partial HTML coverage report."
    exit 1
fi