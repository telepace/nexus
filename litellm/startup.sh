#!/bin/bash
set -e

# 检查 psql 是否可用
if ! command -v psql &> /dev/null; then
    echo "Error: PostgreSQL client (psql) is not installed or not in PATH"
    echo "Installing PostgreSQL client..."
    
    # 尝试使用多种安装方式，增加容错性
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y postgresql-client curl || {
            echo "Failed to install using apt-get, trying with sudo..."
            # 如果普通安装失败，尝试用 sudo
            sudo apt-get update && sudo apt-get install -y postgresql-client curl || {
                echo "Failed to install PostgreSQL client. Exiting."
                exit 1
            }
        }
    elif command -v apk &> /dev/null; then
        # Alpine Linux
        apk add --no-cache postgresql-client curl || {
            echo "Failed to install using apk. Exiting."
            exit 1
        }
    else
        echo "No supported package manager found. Please install PostgreSQL client manually. Exiting."
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        echo "Failed to install PostgreSQL client. Exiting."
        exit 1
    fi
    echo "PostgreSQL client installed successfully."
fi

# 等待 PostgreSQL 准备就绪
echo "Waiting for PostgreSQL to start..."
max_retries=60
counter=0
while ! PGPASSWORD=$POSTGRES_PASSWORD psql -h db -U $POSTGRES_USER -c '\q' 2>/dev/null; do
    counter=$((counter+1))
    if [ $counter -ge $max_retries ]; then
        echo "Error: PostgreSQL did not become available within $max_retries seconds. Exiting."
        exit 1
    fi
    echo "PostgreSQL is unavailable - sleeping (attempt $counter/$max_retries)"
    sleep 1
done

echo "PostgreSQL is up - checking if LiteLLM database exists"

# 检查 LiteLLM 数据库是否存在, 如果不存在则创建
if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h db -U $POSTGRES_USER -lqt | cut -d \| -f 1 | grep -qw $LITELLM_DB_NAME; then
    echo "Creating LiteLLM database..."
    PGPASSWORD=$POSTGRES_PASSWORD psql -h db -U $POSTGRES_USER -c "CREATE DATABASE $LITELLM_DB_NAME;"
    PGPASSWORD=$POSTGRES_PASSWORD psql -h db -U $POSTGRES_USER -c "GRANT ALL PRIVILEGES ON DATABASE $LITELLM_DB_NAME TO $POSTGRES_USER;"
    echo "LiteLLM database created."
else
    echo "LiteLLM database already exists."
fi

# 启动 LiteLLM 代理
echo "Starting LiteLLM proxy..."
exec "$@" 