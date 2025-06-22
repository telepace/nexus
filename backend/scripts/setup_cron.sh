#!/bin/bash
"""
设置定时清理卡住任务的cron作业

这个脚本帮助设置定时任务，每小时自动清理卡住的处理任务。
"""

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Python环境路径（根据实际情况调整）
PYTHON_PATH="/usr/bin/python3"
if command -v python3 &> /dev/null; then
    PYTHON_PATH="$(which python3)"
fi

# 设置环境变量
PYTHONPATH="$PROJECT_ROOT"
CLEANUP_SCRIPT="$SCRIPT_DIR/cleanup_stuck_tasks.py"
LOG_FILE="$PROJECT_ROOT/logs/cron_cleanup.log"

# 确保logs目录存在
mkdir -p "$PROJECT_ROOT/logs"

echo "=== Nexus 任务清理 Cron 设置 ==="
echo "项目根目录: $PROJECT_ROOT"
echo "Python路径: $PYTHON_PATH"
echo "清理脚本: $CLEANUP_SCRIPT"
echo "日志文件: $LOG_FILE"
echo ""

# 检查脚本是否存在
if [ ! -f "$CLEANUP_SCRIPT" ]; then
    echo "❌ 错误: 清理脚本不存在: $CLEANUP_SCRIPT"
    exit 1
fi

# 生成cron条目
CRON_ENTRY="0 * * * * cd $PROJECT_ROOT && PYTHONPATH=$PYTHONPATH $PYTHON_PATH $CLEANUP_SCRIPT --hours 2 --quiet >> $LOG_FILE 2>&1"

echo "建议的cron条目（每小时运行一次）:"
echo "$CRON_ENTRY"
echo ""

# 询问用户是否要添加到crontab
read -p "是否要将此条目添加到当前用户的crontab？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 备份当前crontab
    echo "备份当前crontab..."
    crontab -l > "$PROJECT_ROOT/logs/crontab_backup_$(date +%Y%m%d_%H%M%S).txt" 2>/dev/null || true
    
    # 检查是否已存在相同的条目
    if crontab -l 2>/dev/null | grep -q "cleanup_stuck_tasks.py"; then
        echo "⚠️  检测到已存在的清理任务条目，请手动检查和更新crontab"
        echo "使用 'crontab -e' 编辑crontab"
    else
        # 添加新条目
        (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
        echo "✅ 已添加cron条目"
        echo "可以使用 'crontab -l' 查看当前的cron任务"
    fi
else
    echo "跳过添加cron条目"
    echo ""
    echo "手动添加方法："
    echo "1. 运行: crontab -e"
    echo "2. 添加以下行:"
    echo "$CRON_ENTRY"
fi

echo ""
echo "=== 其他有用的cron条目 ==="
echo ""
echo "# 每天凌晨2点运行完整诊断（发送到邮件）"
echo "0 2 * * * cd $PROJECT_ROOT && PYTHONPATH=$PYTHONPATH $PYTHON_PATH $SCRIPT_DIR/diagnose_stuck_tasks.py"
echo ""
echo "# 每15分钟检查一次（更频繁，用于生产环境）"
echo "*/15 * * * * cd $PROJECT_ROOT && PYTHONPATH=$PYTHONPATH $PYTHON_PATH $CLEANUP_SCRIPT --hours 1 --quiet >> $LOG_FILE 2>&1"
echo ""
echo "# 只显示状态（用于监控）"
echo "0 */6 * * * cd $PROJECT_ROOT && PYTHONPATH=$PYTHONPATH $PYTHON_PATH $CLEANUP_SCRIPT --status >> $LOG_FILE 2>&1"

echo ""
echo "=== 使用说明 ==="
echo "1. 查看日志: tail -f $LOG_FILE"
echo "2. 手动测试: PYTHONPATH=$PYTHONPATH $PYTHON_PATH $CLEANUP_SCRIPT --dry-run"
echo "3. 查看cron任务: crontab -l"
echo "4. 编辑cron任务: crontab -e"
echo "5. 删除所有cron任务: crontab -r"
echo ""
echo "✅ 设置完成！" 