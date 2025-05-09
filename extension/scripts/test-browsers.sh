#!/bin/bash

# 确保脚本在错误时停止执行
set -e

echo "=== 构建扩展 ==="
npm run build

echo "=== 启动测试 ==="

# 测试 Chrome
if [ -n "$(which google-chrome)" ] || [ -n "$(which google-chrome-stable)" ]; then
  echo "在 Chrome 中测试扩展..."
  if [ -n "$(which google-chrome)" ]; then
    CHROME_CMD="google-chrome"
  else
    CHROME_CMD="google-chrome-stable"
  fi
  
  $CHROME_CMD --load-extension=./build/chrome-mv3-prod --no-first-run &
  CHROME_PID=$!
  echo "Chrome PID: $CHROME_PID"
  sleep 10
  kill $CHROME_PID 2>/dev/null || true
  echo "Chrome 测试完成"
else
  echo "未找到 Chrome，跳过 Chrome 测试"
fi

# 测试 Firefox (需要 web-ext 工具)
if [ -n "$(which web-ext)" ]; then
  echo "在 Firefox 中测试扩展..."
  web-ext run --source-dir ./build/firefox-mv3-prod --firefox-profile testing --browser-console --start-url about:debugging#/runtime/this-firefox &
  FIREFOX_PID=$!
  echo "Firefox PID: $FIREFOX_PID"
  sleep 10
  kill $FIREFOX_PID 2>/dev/null || true
  echo "Firefox 测试完成"
else
  echo "未找到 web-ext 工具，跳过 Firefox 测试"
  echo "可以通过命令安装 web-ext: npm install -g web-ext"
fi

# 测试 Edge
if [ -n "$(which msedge)" ]; then
  echo "在 Edge 中测试扩展..."
  msedge --load-extension=./build/chrome-mv3-prod --no-first-run &
  EDGE_PID=$!
  echo "Edge PID: $EDGE_PID"
  sleep 10
  kill $EDGE_PID 2>/dev/null || true
  echo "Edge 测试完成"
else
  echo "未找到 Edge，跳过 Edge 测试"
fi

echo "=== 测试完成 ==="
echo "如果需要手动测试，可以查看以下目录中的构建文件："
echo "Chrome/Edge: ./build/chrome-mv3-prod"
echo "Firefox: ./build/firefox-mv3-prod" 