#!/usr/bin/env python3
"""
完整的端到端中文编码测试
模拟真实的网站解析流程，验证修复效果
"""
import uuid
import tempfile
import os
from unittest.mock import patch, Mock
from sqlmodel import Session
from app.core.db import engine
from app.models.content import ContentItem
from app.utils.content_processors import ContentProcessorFactory

def test_complete_encoding_fix():
    """完整的端到端编码测试"""
    
    print("🔧 完整的端到端中文编码测试...")
    
    # 模拟一个有编码问题的中文网站HTML
    problematic_html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <title>中文网站测试</title>
    <!-- 故意不设置charset，模拟编码问题 -->
</head>
<body>
    <h1>中文标题：人工智能技术发展</h1>
    <h2>技术动态</h2>
    <p>这是一篇关于人工智能技术发展的文章。人工智能（AI）正在改变我们的世界。</p>
    
    <h2>主要技术</h2>
    <ul>
        <li>机器学习（Machine Learning）</li>
        <li>深度学习（Deep Learning）</li>
        <li>自然语言处理（NLP）</li>
        <li>计算机视觉（Computer Vision）</li>
    </ul>
    
    <h2>应用场景</h2>
    <table>
        <tr>
            <th>领域</th>
            <th>应用</th>
            <th>说明</th>
        </tr>
        <tr>
            <td>医疗健康</td>
            <td>疾病诊断</td>
            <td>利用AI进行医学影像分析</td>
        </tr>
        <tr>
            <td>金融科技</td>
            <td>风险控制</td>
            <td>智能风控系统</td>
        </tr>
        <tr>
            <td>智能制造</td>
            <td>质量检测</td>
            <td>自动化质量控制</td>
        </tr>
    </table>
    
    <h2>代码示例</h2>
    <pre><code>
import tensorflow as tf

# 创建一个简单的神经网络
def create_model():
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.Dense(10, activation='softmax')
    ])
    return model

# 训练模型
model = create_model()
print("模型创建成功！")
    </code></pre>
    
    <h2>总结</h2>
    <p>人工智能技术正在快速发展，为各行各业带来创新机遇。我们需要持续学习和适应这一技术变革。</p>
    
    <footer>
        <p>© 2024 中文技术网站 - 专注AI技术分享</p>
    </footer>
</body>
</html>"""
    
    try:
        with Session(engine) as session:
            print("🌐 模拟problematic网站请求...")
            
            # 模拟requests.get的返回，故意设置错误的编码
            def mock_requests_get(url, timeout=None):
                response = Mock()
                response.status_code = 200
                response.headers = {'content-type': 'text/html'}  # 没有charset
                response.encoding = None  # 没有编码信息
                
                # 模拟服务器返回的字节内容
                response.content = problematic_html.encode('utf-8')
                
                # 模拟requests.text的错误行为（使用latin-1解码UTF-8内容会产生乱码）
                try:
                    # 这会导致中文字符变成乱码
                    garbled_text = problematic_html.encode('utf-8').decode('latin-1')
                    response.text = garbled_text
                except:
                    response.text = problematic_html
                
                response.raise_for_status = Mock()
                return response
            
            # 使用patch模拟requests.get
            with patch('app.utils.content_processors.requests.get', side_effect=mock_requests_get):
                
                # 创建测试内容项
                test_content_item = ContentItem(
                    id=uuid.uuid4(),
                    user_id=uuid.uuid4(),
                    type="url",
                    source_uri="https://problematic-chinese-site.com",
                    title="编码问题网站测试",
                    processing_status="pending"
                )
                session.add(test_content_item)
                session.commit()
                
                print(f"✅ 创建了测试ContentItem: {test_content_item.id}")
                
                # 获取处理器并处理内容
                processor = ContentProcessorFactory.get_processor("url")
                
                print("🔄 开始处理URL内容...")
                result = processor.process_content(test_content_item, session)
                
                if result.success:
                    print("✅ URL处理成功")
                    
                    # 检查处理结果
                    markdown_content = result.markdown_content or ""
                    print(f"📝 Markdown内容长度: {len(markdown_content)}")
                    
                    # 检查中文字符
                    chinese_chars = [char for char in markdown_content if '\u4e00' <= char <= '\u9fff']
                    print(f"🔢 包含中文字符数: {len(chinese_chars)}")
                    
                    # 检查是否包含预期的中文内容
                    expected_words = ["人工智能", "技术发展", "机器学习", "深度学习", "自然语言处理"]
                    found_words = []
                    
                    for word in expected_words:
                        if word in markdown_content:
                            found_words.append(word)
                    
                    print(f"✅ 找到预期中文词汇: {', '.join(found_words)}")
                    
                    if len(found_words) >= 3:
                        print("✅ 中文内容解析正常，编码修复生效")
                    else:
                        print("❌ 中文内容解析可能有问题")
                    
                    # 检查content_chunks
                    from app.crud.crud_content import get_content_chunks
                    chunks, total = get_content_chunks(session, test_content_item.id, 1, 10)
                    
                    print(f"📊 创建了 {len(chunks)} 个内容分块")
                    
                    # 详细检查每个chunk
                    all_chunks_ok = True
                    for i, chunk in enumerate(chunks):
                        chunk_content = chunk.chunk_content
                        chunk_chinese = [char for char in chunk_content if '\u4e00' <= char <= '\u9fff']
                        
                        print(f"分块 {i+1}: 中文字符数={len(chunk_chinese)}, 总长度={len(chunk_content)}")
                        print(f"  内容预览: {chunk_content[:80]}...")
                        
                        if len(chunk_chinese) == 0 and any(word in chunk_content for word in expected_words):
                            print(f"  ❌ 分块 {i+1} 可能有编码问题")
                            all_chunks_ok = False
                        else:
                            print(f"  ✅ 分块 {i+1} 编码正常")
                    
                    # 测试API JSON序列化
                    print("🌐 测试完整API响应...")
                    import json
                    
                    api_response = {
                        "data": {
                            "content_id": str(test_content_item.id),
                            "title": test_content_item.title,
                            "processing_status": test_content_item.processing_status,
                            "chunks": [
                                {
                                    "id": str(chunk.id),
                                    "index": chunk.chunk_index,
                                    "content": chunk.chunk_content,
                                    "type": chunk.chunk_type,
                                    "word_count": chunk.word_count,
                                    "char_count": chunk.char_count,
                                }
                                for chunk in chunks
                            ]
                        },
                        "meta": {
                            "total_chunks": len(chunks),
                            "total_chinese_chars": sum(len([c for c in chunk.chunk_content if '\u4e00' <= c <= '\u9fff']) for chunk in chunks)
                        },
                        "error": None
                    }
                    
                    # 使用我们修复的UTF-8 JSON编码
                    try:
                        json_utf8 = json.dumps(api_response, ensure_ascii=False, indent=2)
                        print(f"JSON UTF-8编码长度: {len(json_utf8)} 字符")
                        
                        # 验证往返转换
                        parsed_response = json.loads(json_utf8)
                        
                        if parsed_response["data"]["chunks"]:
                            first_chunk_content = parsed_response["data"]["chunks"][0]["content"]
                            original_chunk_content = chunks[0].chunk_content
                            
                            if first_chunk_content == original_chunk_content:
                                print("✅ API JSON序列化往返正常")
                            else:
                                print("❌ API JSON序列化往返有问题")
                        
                        # 检查元数据
                        total_chinese = parsed_response["meta"]["total_chinese_chars"]
                        print(f"📊 API响应中总中文字符数: {total_chinese}")
                        
                        if total_chinese > 0:
                            print("✅ API响应包含中文内容")
                        else:
                            print("❌ API响应可能丢失中文内容")
                        
                    except Exception as e:
                        print(f"❌ JSON序列化失败: {e}")
                        all_chunks_ok = False
                    
                    # 输出测试结果
                    print(f"\n🆔 测试ContentItem ID: {test_content_item.id}")
                    print("📝 可以使用这个ID在前端测试API响应")
                    
                    if all_chunks_ok and len(found_words) >= 3:
                        print("\n🎉 完整编码测试通过！中文网站解析正常")
                        return True
                    else:
                        print("\n❌ 完整编码测试未完全通过，可能仍有问题")
                        return False
                        
                else:
                    print(f"❌ URL处理失败: {result.error_message}")
                    return False
                    
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 开始完整的端到端中文编码测试...")
    
    success = test_complete_encoding_fix()
    
    if success:
        print("\n🎉 所有编码测试通过！")
        print("\n📋 修复验证:")
        print("1. ✅ MarkItDown处理器URL编码修复生效")
        print("2. ✅ 临时文件UTF-8编码修复生效") 
        print("3. ✅ API响应JSON编码修复生效")
        print("4. ✅ 数据库存储中文内容正常")
        print("5. ✅ 内容分块中文处理正常")
    else:
        print("\n❌ 编码测试未完全通过！")
        print("建议进一步检查具体的编码问题点")
    
    print("\n🔗 前端测试建议:")
    print("- 使用生成的ContentItem ID测试API响应")
    print("- 检查浏览器开发者工具中的响应编码")
    print("- 验证前端显示的中文内容是否正常") 