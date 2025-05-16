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

# 检查.next目录是否存在，它应该在构建时由 builder 阶段生成
if [ ! -d "./.next" ] && [ "$NODE_ENV" = "production" ]; then
  echo "Warning: .next directory not found. The application might not start correctly."
  echo "This could happen if the build process was not completed successfully."
  ls -la
fi

# 根据环境变量决定运行开发模式还是生产模式
if [ "$NODE_ENV" = "production" ]; then
  echo "Starting Next.js application in production mode..."
  exec pnpm start
else
  echo "Starting Next.js application in development mode..."
  pnpm run dev &

  # 仅在开发模式下启动watcher
  echo "Starting watcher..."
  node watcher.js &
  
  wait
fi