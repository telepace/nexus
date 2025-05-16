#!/bin/bash

# 确保脚本具有可执行权限
if [ ! -x "$0" ]; then
  echo "Setting executable permission on script"
  chmod +x "$0"
fi

# 确保watcher脚本有可执行权限
if [ -f "./watcher.js" ] && [ ! -x "./watcher.js" ]; then
  echo "Setting executable permission on watcher.js"
  chmod +x "./watcher.js"
fi

# 启动Next.js应用
echo "Starting Next.js application..."
pnpm run dev &

# 启动watcher脚本监视OpenAPI文件变化
echo "Starting watcher..."
node watcher.js

wait