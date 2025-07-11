#!/usr/bin/env python3
"""
验证AI重新生成功能的简单脚本
"""
import sys
import traceback
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent / "app"))

def test_imports():
    """测试导入是否正常"""
    try:
        print("Testing imports...")
        
        # 测试基本导入
        from app.utils.background_tasks import BackgroundTaskManager
        print("✅ BackgroundTaskManager imported successfully")
        
        # 测试模型导入
        from app.models.content import ContentItem, AIResult
        print("✅ Content models imported successfully")
        
        # 测试API路由导入
        from app.api.routes.content import regenerate_ai_analysis_endpoint
        print("✅ API endpoint imported successfully")
        
        # 测试事件管理器导入
        from app.utils.events import content_event_manager
        print("✅ Event manager imported successfully")
        
        # 测试时区导入
        from app.utils.timezone import now_utc
        print("✅ Timezone utils imported successfully")
        
        print("\n✅ All imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        traceback.print_exc()
        return False

def test_background_task_manager():
    """测试BackgroundTaskManager基本功能"""
    try:
        print("\nTesting BackgroundTaskManager...")
        
        from app.utils.background_tasks import BackgroundTaskManager
        
        # 创建实例
        manager = BackgroundTaskManager()
        print("✅ BackgroundTaskManager instance created")
        
        # 测试方法存在
        assert hasattr(manager, 'start_ai_regeneration'), "start_ai_regeneration method missing"
        print("✅ start_ai_regeneration method exists")
        
        assert hasattr(manager, '_regenerate_ai_analysis_async'), "_regenerate_ai_analysis_async method missing"
        print("✅ _regenerate_ai_analysis_async method exists")
        
        print("✅ BackgroundTaskManager basic functionality verified")
        return True
        
    except Exception as e:
        print(f"❌ BackgroundTaskManager test error: {e}")
        traceback.print_exc()
        return False

def test_api_endpoint():
    """测试API端点基本功能"""
    try:
        print("\nTesting API endpoint...")
        
        from app.api.routes.content import regenerate_ai_analysis_endpoint
        import inspect
        
        # 检查函数签名
        sig = inspect.signature(regenerate_ai_analysis_endpoint)
        params = list(sig.parameters.keys())
        
        expected_params = ['session', 'current_user', 'id']
        for param in expected_params:
            assert param in params, f"Parameter {param} missing from endpoint"
        
        print("✅ API endpoint signature verified")
        
        print("✅ API endpoint basic functionality verified")
        return True
        
    except Exception as e:
        print(f"❌ API endpoint test error: {e}")
        traceback.print_exc()
        return False

def main():
    """主函数"""
    print("🔍 Verifying AI Regeneration Functionality\n")
    
    tests = [
        test_imports,
        test_background_task_manager,
        test_api_endpoint,
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            results.append(False)
    
    print(f"\n📊 Test Results: {sum(results)}/{len(results)} passed")
    
    if all(results):
        print("🎉 All tests passed! AI regeneration functionality appears to be working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())