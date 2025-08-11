#!/bin/bash

# Security Vulnerabilities Fix Script
# 安全漏洞修复脚本

set -e

echo "🔒 开始修复安全漏洞..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查目录是否存在
check_directory() {
    if [ ! -d "$1" ]; then
        log_error "目录 $1 不存在"
        exit 1
    fi
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "命令 $1 未找到，请先安装"
        exit 1
    fi
}

# 备份 package.json 文件
backup_package_file() {
    local dir=$1
    local file=$2
    if [ -f "$dir/$file" ]; then
        cp "$dir/$file" "$dir/$file.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "已备份 $dir/$file"
    fi
}

# 检查必要工具
echo "🔍 检查必要工具..."
check_command "pnpm"
check_command "uv"

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

log_info "项目根目录: $PROJECT_ROOT"

# 修复前端漏洞
echo ""
echo "📦 修复前端项目漏洞..."
check_directory "frontend"
cd frontend

# 备份 package.json
backup_package_file "." "package.json"

log_info "更新 Next.js 到安全版本..."
if pnpm update next@latest; then
    log_success "Next.js 更新成功"
else
    log_warning "Next.js 更新失败，尝试手动安装..."
    pnpm add next@latest
fi

log_info "更新 form-data 到安全版本..."
if pnpm update form-data@latest; then
    log_success "form-data 更新成功"
else
    log_warning "form-data 更新失败，尝试手动安装..."
    pnpm add form-data@latest
fi

log_info "更新 @eslint/plugin-kit..."
pnpm update @eslint/plugin-kit@latest || log_warning "@eslint/plugin-kit 更新可能失败"

log_success "前端漏洞修复完成"

cd ..

# 修复扩展程序漏洞
echo ""
echo "🧩 修复扩展程序漏洞..."
check_directory "extension"
cd extension

# 备份 package.json
backup_package_file "." "package.json"

log_info "更新 msgpackr 到安全版本..."
if pnpm update msgpackr@latest; then
    log_success "msgpackr 更新成功"
else
    log_warning "msgpackr 更新失败，可能由于锁定在 Plasmo 依赖中"
fi

log_info "更新 svelte 到安全版本..."
pnpm update svelte@latest || log_warning "svelte 更新可能失败"

log_info "更新 nanoid 到安全版本..."
if pnpm update nanoid@latest; then
    log_success "nanoid 更新成功"
else
    log_warning "nanoid 更新失败，尝试手动安装..."
    pnpm add nanoid@latest
fi

log_info "更新其他依赖..."
pnpm update brace-expansion@latest || log_warning "brace-expansion 更新可能失败"
pnpm update tmp@latest || log_warning "tmp 更新可能失败"
pnpm update esbuild@latest || log_warning "esbuild 更新可能失败"

log_success "扩展程序漏洞修复完成"

cd ..

# 修复后端依赖
echo ""
echo "🐍 修复后端 Python 依赖..."
check_directory "backend"
cd backend

# 备份 pyproject.toml
backup_package_file "." "pyproject.toml"

log_info "更新关键安全依赖..."

# 安全相关依赖
SECURITY_DEPS=(
    "cryptography>=45.0.6"
    "pyjwt>=3.0.0"
    "httpx>=0.28.0"
    "sentry-sdk>=2.34.1"
    "requests>=2.32.4"
    "pillow>=11.0.0"
)

for dep in "${SECURITY_DEPS[@]}"; do
    log_info "更新 $dep"
    if uv add "$dep"; then
        log_success "$dep 更新成功"
    else
        log_warning "$dep 更新失败"
    fi
done

log_info "更新核心框架..."
CORE_DEPS=(
    "fastapi>=0.116.1"
    "sqlalchemy>=2.0.42"
    "pydantic>=2.11.7"
    "uvicorn>=0.35.0"
)

for dep in "${CORE_DEPS[@]}"; do
    log_info "更新 $dep"
    if uv add "$dep"; then
        log_success "$dep 更新成功"
    else
        log_warning "$dep 更新失败"
    fi
done

log_info "更新 AI/ML 相关依赖..."
AI_DEPS=(
    "openai>=1.99.5"
    "langchain>=0.3.27"
    "llama-index>=0.13.1"
    "anthropic>=0.62.0"
)

for dep in "${AI_DEPS[@]}"; do
    log_info "更新 $dep"
    if uv add "$dep"; then
        log_success "$dep 更新成功"
    else
        log_warning "$dep 更新失败"
    fi
done

log_success "后端依赖更新完成"

cd ..

# 运行安全检查
echo ""
echo "🔍 运行安全检查..."

echo "检查前端漏洞..."
cd frontend
if pnpm audit --audit-level=moderate; then
    log_success "前端安全检查通过"
else
    log_warning "前端仍有一些漏洞需要手动处理"
fi
cd ..

echo "检查扩展程序漏洞..."
cd extension  
if pnpm audit --audit-level=moderate; then
    log_success "扩展程序安全检查通过"
else
    log_warning "扩展程序仍有一些漏洞需要手动处理"
fi
cd ..

# 运行基本测试
echo ""
echo "🧪 运行基本测试..."

log_info "检查前端构建..."
cd frontend
if timeout 300 pnpm build; then
    log_success "前端构建成功"
else
    log_warning "前端构建失败或超时"
fi
cd ..

log_info "检查扩展程序构建..."
cd extension
if timeout 300 pnpm build; then
    log_success "扩展程序构建成功"
else
    log_warning "扩展程序构建失败或超时"
fi
cd ..

log_info "检查后端启动..."
cd backend
if timeout 30 uv run python -c "from app.main import app; print('Backend imports successfully')"; then
    log_success "后端导入检查成功"
else
    log_warning "后端导入检查失败"
fi
cd ..

echo ""
log_success "🎉 安全漏洞修复脚本执行完成！"

echo ""
echo "📋 后续步骤建议："
echo "1. 🧪 运行完整的测试套件："
echo "   - cd frontend && pnpm test"
echo "   - cd extension && pnpm test"
echo "   - cd backend && uv run pytest"
echo ""
echo "2. 🚀 启动应用验证功能："
echo "   - 前端: cd frontend && pnpm dev"
echo "   - 后端: cd backend && uv run uvicorn app.main:app --reload"
echo "   - 扩展: cd extension && pnpm dev"
echo ""
echo "3. 📝 提交修复到代码库："
echo "   - git add ."
echo "   - git commit -m \"security: fix vulnerability issues\""
echo "   - git push"
echo ""
echo "4. 🔍 定期安全扫描："
echo "   - 设置 GitHub Dependabot 自动更新"
echo "   - 配置 CI/CD 安全扫描"
echo "   - 定期运行此脚本"
echo ""

# 检查是否有备份文件
BACKUP_FILES=$(find . -name "*.backup.*" 2>/dev/null)
if [ -n "$BACKUP_FILES" ]; then
    echo "📁 备份文件位置："
    echo "$BACKUP_FILES"
    echo ""
    echo "💡 如果修复后出现问题，可以使用备份文件恢复："
    echo "   cp package.json.backup.YYYYMMDD_HHMMSS package.json"
fi

echo ""
log_success "修复完成！请按照上述步骤进行验证。"