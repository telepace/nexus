#!/usr/bin/env bash

# Run backend tests with coverage
# This script runs pytest with coverage reporting

# Strict mode, exit immediately if any command fails
set -e

# Get the absolute path of the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "🧪 Running backend tests with coverage..."

# Make sure we're using the test database
export TESTING=true

# Enter backend directory
cd "$BACKEND_DIR"

# Check if we're in CI environment
if [ "${CI:-false}" = "true" ]; then
    echo "🤖 Running in CI environment"
    echo "📊 System resources:"
    echo "  Memory: $(free -h | grep '^Mem:' | awk '{print $2}' || echo 'N/A')"
    echo "  CPU cores: $(nproc || echo 'N/A')"
    echo "  Disk space: $(df -h . | tail -1 | awk '{print $4}' || echo 'N/A')"
fi

# Test database connectivity
echo "🔍 Testing database connectivity..."
python -c "
import os
import sys
from sqlalchemy import create_engine, text
from app.core.config import settings

try:
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    sys.exit(1)
" || {
    echo "❌ Database connectivity check failed"
    exit 1
}

# Set default title for coverage report
TITLE="${@:-coverage}"

# Function to run tests with better error handling
run_tests() {
    local test_args="$1"
    echo "🧪 Running tests with test database..."
    
    # Run tests with coverage, excluding problematic files
    # Removed parallel execution to avoid database race conditions
    TESTING=true coverage run --source=app -m pytest \
        --tb=short \
        --maxfail=10 \
        --durations=10 \
        -v \
        --ignore=scripts/ \
        --ignore=test_litellm_connection.py \
        app/tests/ \
        $test_args \
        || {
        echo "❌ Tests failed or timed out"
        return 1
    }
    return 0
}

# Run all tests
if run_tests ""; then
    echo "✅ All tests passed successfully"
    
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
else
    echo "❌ Tests failed"
    echo "📊 Generating partial coverage report..."
    coverage report --show-missing || true
    exit 1
fi