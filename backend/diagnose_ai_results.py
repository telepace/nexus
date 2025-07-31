#!/usr/bin/env python3
"""
简单的AI结果诊断脚本 - 无需依赖项
"""

from pathlib import Path


def check_environment():
    """检查环境变量配置"""
    print("🔍 检查环境配置...")

    # 检查 .env 文件
    env_files = [
        Path("/Users/a1234/nexus/backend/.env"),
        Path("/Users/a1234/nexus/backend/.env.local"),
        Path("/Users/a1234/nexus/.env"),
        Path("/Users/a1234/nexus/.env.local"),
    ]

    found_env = False
    for env_file in env_files:
        if env_file.exists():
            print(f"✅ 找到环境文件: {env_file}")
            found_env = True

            # 读取环境文件内容
            try:
                with open(env_file) as f:
                    content = f.read()

                # 检查关键配置
                if "LITELLM_PROXY_URL" in content:
                    print("   ✅ 找到 LITELLM_PROXY_URL 配置")
                else:
                    print("   ❌ 缺少 LITELLM_PROXY_URL 配置")

                if "LITELLM_MASTER_KEY" in content:
                    print("   ✅ 找到 LITELLM_MASTER_KEY 配置")
                else:
                    print("   ❌ 缺少 LITELLM_MASTER_KEY 配置")

                if "DEFAULT_LLM_MODEL" in content:
                    print("   ✅ 找到 DEFAULT_LLM_MODEL 配置")
                else:
                    print("   ❌ 缺少 DEFAULT_LLM_MODEL 配置")

            except Exception as e:
                print(f"   ❌ 读取环境文件失败: {e}")

    if not found_env:
        print("❌ 未找到任何环境配置文件")

    print()


def check_templates():
    """检查 Jinja2 模板文件"""
    print("📝 检查AI模板文件...")

    template_dir = Path("/Users/a1234/nexus/backend/app/prompt_templates")
    required_templates = ["summary.j2", "key_points.j2", "labels.j2"]

    if not template_dir.exists():
        print(f"❌ 模板目录不存在: {template_dir}")
        return

    print(f"✅ 模板目录存在: {template_dir}")

    for template in required_templates:
        template_path = template_dir / template
        if template_path.exists():
            try:
                with open(template_path, encoding="utf-8") as f:
                    content = f.read()
                    print(f"   ✅ {template} (长度: {len(content)} 字符)")

                    # 检查模板内容完整性
                    if len(content.strip()) < 100:
                        print("      ⚠️  模板内容过短，可能不完整")
            except Exception as e:
                print(f"   ❌ 读取 {template} 失败: {e}")
        else:
            print(f"   ❌ 缺少模板文件: {template}")

    print()


def check_database_schema():
    """检查数据库架构是否正确"""
    print("🗄️  检查数据库架构文件...")

    model_files = [
        Path("/Users/a1234/nexus/backend/app/models/content.py"),
        Path("/Users/a1234/nexus/backend/app/models/__init__.py"),
    ]

    for model_file in model_files:
        if model_file.exists():
            print(f"✅ 模型文件存在: {model_file.name}")

            try:
                with open(model_file) as f:
                    content = f.read()

                # 检查关键模型类
                if "class AIResult" in content:
                    print("   ✅ 找到 AIResult 模型定义")
                if "class ContentItem" in content:
                    print("   ✅ 找到 ContentItem 模型定义")

            except Exception as e:
                print(f"   ❌ 读取模型文件失败: {e}")
        else:
            print(f"❌ 模型文件不存在: {model_file}")

    print()


def check_background_tasks():
    """检查后台任务管理器"""
    print("⚙️  检查后台任务系统...")

    task_file = Path("/Users/a1234/nexus/backend/app/utils/background_tasks.py")
    if task_file.exists():
        print(f"✅ 后台任务文件存在: {task_file}")

        try:
            with open(task_file) as f:
                content = f.read()

            # 检查关键功能
            if "PreprocessingPipeline" in content:
                print("   ✅ 集成了预处理管道")
            if "_ai_initialization_layer" in content:
                print("   ✅ 包含AI初始化层调用")
            if "AIResult" in content:
                print("   ✅ 包含AI结果存储逻辑")

        except Exception as e:
            print(f"   ❌ 读取后台任务文件失败: {e}")
    else:
        print(f"❌ 后台任务文件不存在: {task_file}")

    print()


def check_api_routes():
    """检查API路由"""
    print("🌐 检查API路由...")

    routes_file = Path("/Users/a1234/nexus/backend/app/api/routes/content.py")
    if routes_file.exists():
        print("✅ 内容API路由文件存在")

        try:
            with open(routes_file) as f:
                content = f.read()

            # 检查AI结果相关API
            if "ai_result" in content.lower():
                print("   ✅ API中包含AI结果处理")
            if "AIResult" in content:
                print("   ✅ API中包含AI结果模型引用")
            if "regenerate" in content.lower():
                print("   ✅ API中包含重新生成功能")

        except Exception as e:
            print(f"   ❌ 读取API路由文件失败: {e}")
    else:
        print("❌ 内容API路由文件不存在")

    print()


def main():
    """主诊断函数"""
    print("🩺 AI结果诊断开始...")
    print("=" * 50)

    check_environment()
    check_templates()
    check_database_schema()
    check_background_tasks()
    check_api_routes()

    print("=" * 50)
    print("📋 诊断总结:")
    print("如果上面有❌标记，说明对应组件可能有问题")
    print("请重点检查缺失的配置或文件")
    print("\n💡 下一步建议:")
    print("1. 确保所有环境变量正确设置")
    print("2. 验证LiteLLM服务是否正常运行")
    print("3. 检查数据库连接和表结构")
    print("4. 查看应用日志中的错误信息")


if __name__ == "__main__":
    main()
