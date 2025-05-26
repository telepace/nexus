#!/bin/bash

# 设置错误时退出
set -e

echo "开始设置测试环境..."

# 安装依赖
echo "安装依赖..."
pnpm install

# 安装Playwright浏览器
echo "安装Playwright浏览器..."
pnpm exec playwright install chromium

# 构建扩展
echo "构建扩展..."
pnpm build

# 验证安装
echo "验证安装..."
pnpm exec playwright --version

echo "测试环境设置完成！"
echo "你现在可以运行以下命令来执行测试："
echo "  pnpm test        - 运行所有测试"
echo "  pnpm test:debug  - 使用调试模式运行测试"
echo "  pnpm test:ui     - 使用UI模式运行测试" 