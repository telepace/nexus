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

# Set default title for coverage report
TITLE="${@:-coverage}"

# Function to run tests with better error handling
run_tests() {
    local test_args="$1"
    echo "🧪 Running tests with test database..."
    
    # Run tests with coverage
    TESTING=true coverage run --source=app -m pytest \
        --tb=short \
        --maxfail=10 \
        --durations=10 \
        -v \
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
