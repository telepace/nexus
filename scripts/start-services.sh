#!/bin/bash
set -e

echo "🚀 启动 Nexus 服务..."

# 检查 Docker 是否运行
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker 未运行，正在启动 Docker Desktop..."
    open -a Docker
    echo "⏳ 等待 Docker 启动..."
    while ! docker info >/dev/null 2>&1; do
        sleep 2
        echo "   等待中..."
    done
    echo "✅ Docker 已启动"
else
    echo "✅ Docker 已运行"
fi

# 启动核心服务（数据库、Redis、LiteLLM）
echo "🔧 启动核心服务..."
docker compose up db redis litellm -d

# 等待服务健康检查
echo "⏳ 等待服务就绪..."
sleep 5

# 检查 LiteLLM 是否可用
max_retries=30
counter=0
while ! curl -s http://localhost:4000/health >/dev/null 2>&1; do
    counter=$((counter+1))
    if [ $counter -ge $max_retries ]; then
        echo "❌ LiteLLM 服务启动失败"
        exit 1
    fi
    echo "   等待 LiteLLM 启动... ($counter/$max_retries)"
    sleep 2
done

echo "✅ LiteLLM 服务已就绪"

# 启动后端服务
echo "🔧 启动后端服务..."
docker compose up backend -d

echo "🎉 所有服务已启动！"
echo ""
echo "📍 服务地址："
echo "   • API: http://localhost:8000"
echo "   • LiteLLM: http://localhost:4000"
echo "   • 数据库: localhost:5432"
echo "   • Redis: localhost:6379"
echo ""
echo "💡 使用 'docker compose logs -f' 查看日志" 