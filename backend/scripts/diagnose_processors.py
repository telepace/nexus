#!/usr/bin/env python3
"""
Nexus 内容处理器诊断工具

使用方法:
python scripts/diagnose_processors.py
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 设置环境变量
os.environ.setdefault("PYTHONPATH", str(project_root))


def main():
    """运行处理器诊断"""
    try:
        # 导入必要模块
        from app.core.config import settings
        from app.utils.content_processors import ProcessorDiagnostic

        print("🚀 启动 Nexus 内容处理器诊断...")
        print()

        # 显示当前配置信息
        print("📋 当前配置:")
        print(f"   JINA_API_KEY: {'已配置' if settings.JINA_API_KEY else '未配置'}")
        print(
            f"   FIRECRAWL_API_KEY: {'已配置' if getattr(settings, 'FIRECRAWL_API_KEY', None) else '未配置'}"
        )
        print(
            f"   SCRAPINGBEE_API_KEY: {'已配置' if getattr(settings, 'SCRAPINGBEE_API_KEY', None) else '未配置'}"
        )
        print()

        # 运行诊断
        diagnostic = ProcessorDiagnostic()
        diagnosis = diagnostic.diagnose_all()

        # 打印报告
        diagnostic.print_diagnosis_report(diagnosis)

        # 保存诊断结果到文件
        import json
        from datetime import datetime

        output_file = (
            f"processor_diagnosis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        output_path = project_root / "_output" / "tmp" / output_file

        # 确保输出目录存在
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(diagnosis, f, indent=2, ensure_ascii=False)

        print(f"📄 诊断结果已保存到: {output_path}")

        # 根据诊断结果返回适当的退出码
        if diagnosis["summary"]["unavailable_processors"] > 0:
            print(
                f"\n⚠️  发现 {diagnosis['summary']['unavailable_processors']} 个不可用的处理器"
            )
            return 1
        else:
            print("\n🎉 所有处理器都正常工作！")
            return 0

    except ImportError as e:
        print(f"❌ 导入错误: {e}")
        print("请确保在正确的 Python 环境中运行此脚本")
        return 1
    except Exception as e:
        print(f"❌ 诊断过程中出现错误: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
