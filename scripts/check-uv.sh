#!/bin/bash

# 定义 UV 的安装路径
UV_PATH="${HOME}/.cargo/bin/uv"

# 检查 uv 是否已安装并可执行
check_uv_installed() {
    if [ -x "$UV_PATH" ]; then
        echo "===========> uv found at $UV_PATH"
        return 0
    else
        echo "===========> uv not found at $UV_PATH or not executable."
        return 1
    fi
}

# 安装 uv
install_uv() {
    echo "===========> Attempting to install uv..."
    curl -sSf https://astral.sh/uv/install.sh | sh

    # 更新 PATH
    if [ -f "${HOME}/.cargo/env" ]; then
        source "${HOME}/.cargo/env"
    fi

    # 验证安装是否成功
    if check_uv_installed; then
        echo "===========> uv installed successfully to $UV_PATH"
    else
        echo "===========> ERROR: uv installation failed."
        exit 1
    fi
}

# 主逻辑
main() {
    if ! check_uv_installed; then
        install_uv
    fi

    # 最终验证
    echo "===========> Verifying uv version..."
    if "$UV_PATH" --version; then
        echo "===========> uv is ready."
    else
        echo "===========> ERROR: uv is not working correctly."
        exit 1
    fi
}

# 执行主逻辑
main
