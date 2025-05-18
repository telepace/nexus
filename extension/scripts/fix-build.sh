#!/bin/bash

# 脚本说明：此脚本用于修复Plasmo构建后的CSS引用问题
# 用法：在完成Plasmo构建后运行此脚本

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXTENSION_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$EXTENSION_DIR/build/chrome-mv3-prod"

# 确保目录存在
if [ ! -d "$BUILD_DIR" ]; then
  echo "错误: 构建目录不存在: $BUILD_DIR"
  exit 1
fi

echo "开始修复 CSS 引用问题..."

# 创建样式目录
STYLES_DIR="$BUILD_DIR/styles"
mkdir -p "$STYLES_DIR"

# 复制 tailwind.css 文件
if [ -f "$EXTENSION_DIR/styles/tailwind.css" ]; then
  echo "复制 tailwind.css 文件到构建目录..."
  cp "$EXTENSION_DIR/styles/tailwind.css" "$STYLES_DIR/"
  echo "已复制: $EXTENSION_DIR/styles/tailwind.css -> $STYLES_DIR/tailwind.css"
else
  echo "错误: tailwind.css 文件不存在: $EXTENSION_DIR/styles/tailwind.css"
  exit 1
fi

# 复制 sidepanel.html 文件
if [ -f "$EXTENSION_DIR/sidepanel.html" ]; then
  echo "复制自定义 sidepanel.html 文件到构建目录..."
  cp "$EXTENSION_DIR/sidepanel.html" "$BUILD_DIR/"
  echo "已复制: $EXTENSION_DIR/sidepanel.html -> $BUILD_DIR/sidepanel.html"
else
  echo "警告: 自定义 sidepanel.html 文件不存在: $EXTENSION_DIR/sidepanel.html"
fi

# 成功完成
echo "修复完成! 现在可以测试扩展了。" 