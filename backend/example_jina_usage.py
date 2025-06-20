#!/usr/bin/env python3
"""
Jina AI 优化功能使用示例

本示例展示了如何使用优化后的 Jina AI 处理器：
1. 使用 X-Remove-Selector 头部移除不需要的页面元素
2. 使用 GET 请求方式调用 API
3. 获得更清洁的 Markdown 内容
"""

import os
import requests
from datetime import datetime


def demo_jina_api_call():
    """演示优化后的 Jina API 调用"""
    
    # 检查 API Key
    api_key = os.getenv("JINA_API_KEY")
    if not api_key:
        print("❌ 请设置 JINA_API_KEY 环境变量")
        return
    
    # 测试 URL - 可以替换为任何你想要测试的网页
    test_urls = [
        "https://docs.python.org/3/tutorial/introduction.html",
        "https://fastapi.tiangolo.com/tutorial/first-steps/",
        "https://github.com/microsoft/markitdown",
    ]
    
    print("🚀 开始演示优化后的 Jina AI 处理功能\n")
    
    for i, url in enumerate(test_urls, 1):
        print(f"📋 测试 {i}: {url}")
        
        # 设置请求头，包含优化的 X-Remove-Selector
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            # 优化的选择器，移除常见的页面噪音元素
            "X-Remove-Selector": (
                "header, nav, footer, .sidebar, .navigation, .breadcrumb, "
                ".copyright, .pagination, .menu, .toc, .table-of-contents, "
                ".doc-sidebar, .navbar, .header, .footer-wrapper, .site-footer, "
                ".site-header, .skip-link, .version-selector, .language-selector, "
                ".ads, .advertisement, .social-share, .comments, .related-posts, "
                ".recommended, .popup, .modal, .overlay, .banner, .promotion"
            )
        }
        
        # 使用 GET 请求方式
        full_url = f"https://r.jina.ai/{url}"
        
        try:
            print(f"🔗 调用 API: {full_url}")
            start_time = datetime.now()
            
            response = requests.get(
                full_url,
                headers=headers,
                timeout=60
            )
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            if response.status_code == 200:
                content = response.text
                print(f"✅ 成功获取内容 (耗时: {duration:.2f}s)")
                print(f"📏 内容长度: {len(content)} 字符")
                
                # 显示内容预览
                lines = content.split('\n')
                non_empty_lines = [line for line in lines if line.strip()]
                
                print("📄 内容预览:")
                for j, line in enumerate(non_empty_lines[:5]):
                    print(f"   {line[:80]}{'...' if len(line) > 80 else ''}")
                
                if len(non_empty_lines) > 5:
                    print(f"   ... (还有 {len(non_empty_lines) - 5} 行)")
                
                # 分析内容质量
                title_count = len([line for line in lines if line.startswith('#')])
                print(f"📊 内容分析:")
                print(f"   - 总行数: {len(lines)}")
                print(f"   - 非空行数: {len(non_empty_lines)}")
                print(f"   - 标题数量: {title_count}")
                
                # 检查是否成功移除了常见的噪音元素
                noise_indicators = [
                    "navigation", "menu", "sidebar", "footer", 
                    "copyright", "privacy", "cookie", "advertisement"
                ]
                noise_found = sum(1 for indicator in noise_indicators 
                                if indicator.lower() in content.lower())
                
                if noise_found < 2:
                    print("✅ 内容质量良好，成功移除了大部分噪音元素")
                else:
                    print(f"⚠️  检测到 {noise_found} 个可能的噪音元素")
                
            else:
                print(f"❌ API 调用失败: {response.status_code}")
                print(f"📄 错误信息: {response.text[:200]}")
        
        except Exception as e:
            print(f"❌ 处理异常: {str(e)}")
        
        print("-" * 80)
    
    print("🎉 演示完成!")


def compare_with_without_selector():
    """对比使用和不使用 X-Remove-Selector 的效果"""
    
    api_key = os.getenv("JINA_API_KEY")
    if not api_key:
        print("❌ 请设置 JINA_API_KEY 环境变量")
        return
    
    test_url = "https://docs.python.org/3/tutorial/introduction.html"
    
    print("🔬 对比测试：使用和不使用 X-Remove-Selector 的效果\n")
    
    # 测试1: 不使用 X-Remove-Selector
    print("📋 测试1: 不使用 X-Remove-Selector")
    headers_without = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    try:
        response1 = requests.get(f"https://r.jina.ai/{test_url}", headers=headers_without, timeout=60)
        if response1.status_code == 200:
            content1 = response1.text
            print(f"✅ 内容长度: {len(content1)} 字符")
        else:
            print(f"❌ 失败: {response1.status_code}")
            return
    except Exception as e:
        print(f"❌ 异常: {e}")
        return
    
    print()
    
    # 测试2: 使用 X-Remove-Selector
    print("📋 测试2: 使用 X-Remove-Selector")
    headers_with = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-Remove-Selector": (
            "header, nav, footer, .sidebar, .navigation, .breadcrumb, "
            ".copyright, .pagination, .menu, .toc, .table-of-contents, "
            ".doc-sidebar, .navbar, .header, .footer-wrapper, .site-footer, "
            ".site-header, .skip-link, .version-selector, .language-selector"
        )
    }
    
    try:
        response2 = requests.get(f"https://r.jina.ai/{test_url}", headers=headers_with, timeout=60)
        if response2.status_code == 200:
            content2 = response2.text
            print(f"✅ 内容长度: {len(content2)} 字符")
        else:
            print(f"❌ 失败: {response2.status_code}")
            return
    except Exception as e:
        print(f"❌ 异常: {e}")
        return
    
    # 对比分析
    print("\n📊 对比分析:")
    length_diff = len(content1) - len(content2)
    percentage = (length_diff / len(content1)) * 100 if len(content1) > 0 else 0
    
    print(f"   - 原始内容: {len(content1)} 字符")
    print(f"   - 优化内容: {len(content2)} 字符")
    print(f"   - 减少内容: {length_diff} 字符 ({percentage:.1f}%)")
    
    if length_diff > 0:
        print("✅ X-Remove-Selector 成功移除了冗余内容，提高了内容质量")
    else:
        print("ℹ️  内容长度变化不明显，可能该页面本身就比较简洁")


if __name__ == "__main__":
    print("🎯 Jina AI 优化功能演示")
    print("=" * 50)
    
    # 基本演示
    demo_jina_api_call()
    
    print("\n" + "=" * 50)
    
    # 对比测试
    compare_with_without_selector()
    
    print("\n💡 使用建议:")
    print("1. X-Remove-Selector 能显著提高内容提取质量")
    print("2. 根据目标网站特点调整选择器")
    print("3. 定期监控提取效果，优化选择器配置")
    print("4. 对于重要内容，建议使用优化后的 Jina AI 处理") 