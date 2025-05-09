#!/bin/bash

# 确保 gh CLI 已安装
if ! command -v gh &> /dev/null; then
    echo "错误: 未安装 GitHub CLI (gh)"
    echo "请访问 https://cli.github.com/ 安装"
    exit 1
fi

# 确保已登录
if ! gh auth status &> /dev/null; then
    echo "您尚未登录 GitHub CLI"
    echo "请运行 'gh auth login' 登录"
    exit 1
fi

# 检查当前所在目录是否为 Git 仓库
if [ ! -d ".git" ] && [ ! -d "../.git" ]; then
    echo "错误: 当前目录不是 Git 仓库"
    echo "请在 Git 仓库根目录或扩展目录运行此脚本"
    exit 1
fi

# 获取仓库信息
if [ -d ".git" ]; then
    REPO_ROOT="."
else
    REPO_ROOT=".."
fi

# 提示用户输入仓库名称
echo "请输入 GitHub 仓库信息 (格式: 用户名/仓库名):"
read -p "> " REPO_NAME

# 加载环境变量
ENV_FILE="env.example"
if [ -f "$ENV_FILE" ]; then
    echo "加载环境变量示例文件: $ENV_FILE"
else
    echo "错误: 未找到环境变量示例文件 $ENV_FILE"
    exit 1
fi

# 读取并设置 secrets
echo "正在设置 GitHub Secrets..."

while IFS='=' read -r key value || [ -n "$key" ]; do
    # 跳过注释和空行
    if [[ $key == \#* || -z $key ]]; then
        continue
    fi

    # 去除前后空格
    key=$(echo "$key" | xargs)
    
    # 提示用户输入值
    echo ""
    echo "设置 $key:"
    echo "示例: $value"
    read -p "> " SECRET_VALUE
    
    # 如果用户输入了值，则设置 secret
    if [ -n "$SECRET_VALUE" ]; then
        echo "正在设置 $key..."
        echo "$SECRET_VALUE" | gh secret set "$key" --repo "$REPO_NAME"
        echo "$key 已设置"
    else
        echo "跳过 $key"
    fi
done < "$ENV_FILE"

echo ""
echo "所有密钥已设置完成!"
echo "您可以在 GitHub 仓库设置中查看 Secrets" 