#!/bin/bash

# 回滚到原始版本

echo "🔄 回滚到原始版本..."

if [ -f "lib/token-manager-original.ts" ]; then
    cp "lib/token-manager-original.ts" "lib/token-manager.ts"
    echo "✅ token-manager 已回滚"
fi

if [ -f "middleware-original.ts" ]; then
    cp "middleware-original.ts" "middleware.ts"
    echo "✅ middleware 已回滚"
fi

if [ -f "lib/auth-context-original.tsx" ]; then
    cp "lib/auth-context-original.tsx" "lib/auth-context.tsx"
    echo "✅ auth-context 已回滚"
fi

echo "✅ 回滚完成！请重启开发服务器"
