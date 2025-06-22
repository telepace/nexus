#!/bin/bash

# Content Model Refactor - 自动执行脚本
# 针对 Issue #176 的解决方案

set -e  # 遇到错误立即退出

echo "🚀 开始内容模型重构..."
echo "========================================"

# 检查当前目录
if [ ! -f "app/alembic/env.py" ]; then
    echo "❌ 请在 backend 目录下运行此脚本"
    exit 1
fi

# 检查数据库连接
echo "📡 检查数据库连接..."
if ! uv run python -c "from app.core.database import get_session; print('数据库连接正常')" 2>/dev/null; then
    echo "❌ 数据库连接失败，请检查配置"
    exit 1
fi

# 备份数据库（可选）
read -p "是否需要备份数据库？(y/N): " backup
if [[ $backup =~ ^[Yy]$ ]]; then
    echo "💾 创建数据库备份..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="backup_before_refactor_${timestamp}.sql"
    
    # 这里需要根据实际的数据库配置调整
    echo "请手动执行数据库备份命令，例如："
    echo "pg_dump your_database > ${backup_file}"
    read -p "备份完成后按 Enter 继续..."
fi

# Phase 1: 数据完整性修复
echo ""
echo "📋 Phase 1: 数据完整性修复"
echo "----------------------------------------"

echo "🔧 应用 Phase 1 迁移（恢复外键约束）..."
if [ -f "app/alembic/versions/phase1_foreign_keys.py" ]; then
    uv run alembic upgrade head
    echo "✅ Phase 1 迁移完成"
else
    echo "⚠️  Phase 1 迁移文件不存在，跳过..."
fi

# Phase 2: 核心表结构引入
echo ""
echo "📋 Phase 2: 核心表结构引入"
echo "----------------------------------------"

echo "🔧 应用 Phase 2 迁移（创建 ai_results 和 segments 表）..."
if [ -f "app/alembic/versions/phase2_migration.py" ]; then
    uv run alembic upgrade head
    echo "✅ Phase 2 迁移完成"
else
    echo "⚠️  Phase 2 迁移文件不存在，跳过..."
fi

# 数据迁移
echo ""
echo "📊 执行数据迁移..."
if [ -f "scripts/migrate_data.py" ]; then
    echo "🔍 预览数据迁移..."
    uv run python scripts/migrate_data.py --dry-run
    
    read -p "是否执行数据迁移？(y/N): " migrate
    if [[ $migrate =~ ^[Yy]$ ]]; then
        echo "🔄 执行数据迁移..."
        uv run python scripts/migrate_data.py --execute
        echo "✅ 数据迁移完成"
    else
        echo "⏭️  跳过数据迁移"
    fi
else
    echo "⚠️  数据迁移脚本不存在，跳过..."
fi

# Phase 3: 性能优化
echo ""
echo "📋 Phase 3: 性能优化"
echo "----------------------------------------"

echo "🔧 应用 Phase 3 迁移（添加性能索引）..."
if [ -f "app/alembic/versions/phase3_indexes.py" ]; then
    uv run alembic upgrade head
    echo "✅ Phase 3 迁移完成"
else
    echo "⚠️  Phase 3 迁移文件不存在，跳过..."
fi

# 验证重构结果
echo ""
echo "🧪 验证重构结果"
echo "----------------------------------------"

if [ -f "scripts/test_refactor.py" ]; then
    echo "🔍 运行重构验证测试..."
    if uv run python scripts/test_refactor.py; then
        echo "✅ 重构验证测试通过"
    else
        echo "❌ 重构验证测试失败"
        echo "请检查错误信息并修复问题"
        exit 1
    fi
else
    echo "⚠️  验证测试脚本不存在，跳过自动验证"
fi

# 检查数据库状态
echo ""
echo "📊 检查数据库状态"
echo "----------------------------------------"

echo "🔍 检查表结构..."
uv run python -c "
from app.core.database import get_session
from sqlmodel import Session, text

with Session(get_session()) as session:
    # 检查新表是否存在
    tables = session.exec(text(\"\"\"
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('ai_results', 'segments')
    \"\"\")).all()
    
    print(f'新表创建状态:')
    for table in tables:
        print(f'  ✅ {table[0]}')
    
    # 检查索引
    indexes = session.exec(text(\"\"\"
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE tablename IN ('ai_results', 'segments')
        AND indexname LIKE '%gin%'
    \"\"\")).all()
    
    print(f'\\nGIN 索引状态:')
    for idx in indexes:
        print(f'  ✅ {idx[0]} on {idx[1]}')
"

# 完成
echo ""
echo "🎉 内容模型重构完成！"
echo "========================================"
echo ""
echo "📝 后续步骤："
echo "1. 更新应用代码中对 ContentItem.summary 的引用"
echo "2. 更新 ContentChunk 相关代码为 Segment"
echo "3. 测试 API 端点的响应格式"
echo "4. 监控数据库性能指标"
echo ""
echo "📚 详细文档请参考: backend/CONTENT_REFACTOR_README.md"
echo ""

# 询问是否运行额外测试
read -p "是否运行完整的测试套件？(y/N): " run_tests
if [[ $run_tests =~ ^[Yy]$ ]]; then
    echo "🧪 运行完整测试套件..."
    uv run pytest app/tests/ -v --tb=short
fi

echo "✨ 重构流程完成！" 