#!/bin/bash

# 切换到优化版本的认证系统

echo "🔄 切换到优化版本..."

# 检查文件是否存在
if [ ! -f "lib/token-manager-optimized.ts" ]; then
    echo "❌ 错误: 优化版文件不存在"
    exit 1
fi

# 备份当前文件并切换
echo "备份并切换 token-manager..."
if [ -f "lib/token-manager.ts" ]; then
    mv "lib/token-manager.ts" "lib/token-manager-original.ts"
fi
cp "lib/token-manager-optimized.ts" "lib/token-manager.ts"

echo "备份并切换 middleware..."
if [ -f "middleware.ts" ]; then
    mv "middleware.ts" "middleware-original.ts"
fi
cp "middleware-optimized.ts" "middleware.ts"

echo "备份并切换 auth-context..."
if [ -f "lib/auth-context.tsx" ]; then
    mv "lib/auth-context.tsx" "lib/auth-context-original.tsx"
fi
cp "lib/auth-context-optimized.tsx" "lib/auth-context.tsx"

echo "✅ 切换完成！请重启开发服务器："
echo "   pnpm dev"
