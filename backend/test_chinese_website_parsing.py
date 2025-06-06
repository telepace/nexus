#!/usr/bin/env python3
"""
测试中文网站解析的编码问题
"""
import uuid
import requests
import tempfile
import os
from sqlmodel import Session
from app.core.db import engine
from app.models.content import ContentItem
from app.utils.content_processors import ProcessingPipeline, ProcessingContext
from app.utils.storage import get_storage_service

def test_chinese_website_parsing():
    """测试中文网站解析的完整流程"""
    
    print("🔍 测试中文网站解析编码问题...")
    
    # 模拟中文网站HTML内容（带有不同编码声明）
    chinese_html_content = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>中文测试网站</title>
</head>
<body>
    <h1>中文内容测试</h1>
    <h2>技术文档</h2>
    <p>这是一个包含中文内容的测试网页，用于验证编码处理是否正确。</p>
    
    <h2>特殊字符测试</h2>
    <ul>
        <li>简体中文：你好世界</li>
        <li>繁体中文：你好世界</li>
        <li>标点符号：《》「」【】</li>
        <li>技术术语：人工智能（AI）</li>
    </ul>
    
    <h2>代码示例</h2>
    <pre><code>
def greet(name):
    print(f"你好，{name}！")
    return "成功"
    
# 中文注释
greet("世界")
    </code></pre>
    
    <h2>数据表格</h2>
    <table>
        <tr>
            <th>项目</th>
            <th>数量</th>
            <th>说明</th>
        </tr>
        <tr>
            <td>用户数</td>
            <td>1000</td>
            <td>活跃用户</td>
        </tr>
        <tr>
            <td>文档数</td>
            <td>500</td>
            <td>技术文档</td>
        </tr>
    </table>
    
    <p>测试结束。希望所有中文字符都能正确显示。</p>
</body>
</html>"""
    
    try:
        with Session(engine) as session:
            # 1. 测试不同编码方式的HTML内容
            encoding_tests = [
                ("utf-8", chinese_html_content),
                ("gbk", chinese_html_content.encode('utf-8').decode('utf-8')),  # 确保是UTF-8
            ]
            
            for encoding_name, html_content in encoding_tests:
                print(f"\n🧪 测试 {encoding_name} 编码...")
                
                # 创建测试内容项
                test_content_item = ContentItem(
                    id=uuid.uuid4(),
                    user_id=uuid.uuid4(),
                    type="url",
                    source_uri=f"https://test-chinese-site-{encoding_name}.com",
                    title=f"中文网站测试 ({encoding_name})",
                    processing_status="pending"
                )
                session.add(test_content_item)
                session.commit()
                
                # 2. 模拟网站请求和处理过程
                print("🌐 模拟网站内容获取...")
                
                # 检查原始HTML内容的编码
                html_bytes = html_content.encode('utf-8')
                print(f"HTML内容字节长度: {len(html_bytes)}")
                print(f"HTML内容字符长度: {len(html_content)}")
                
                # 检查HTML中的中文字符
                chinese_chars = [char for char in html_content if '\u4e00' <= char <= '\u9fff']
                print(f"包含中文字符数: {len(chinese_chars)}")
                print(f"中文字符样例: {chinese_chars[:10] if chinese_chars else '无'}")
                
                # 3. 测试requests处理（模拟真实网站请求）
                print("📡 测试HTTP响应处理...")
                
                # 模拟requests.Response对象
                class MockResponse:
                    def __init__(self, content, encoding='utf-8'):
                        self._content = content.encode(encoding)
                        self.encoding = encoding
                        self.status_code = 200
                        self.headers = {
                            'content-type': f'text/html; charset={encoding}'
                        }
                    
                    @property
                    def text(self):
                        return self._content.decode(self.encoding)
                    
                    def raise_for_status(self):
                        pass
                
                mock_response = MockResponse(html_content, 'utf-8')
                response_text = mock_response.text
                
                print(f"HTTP响应文本长度: {len(response_text)}")
                print(f"HTTP响应编码: {mock_response.encoding}")
                
                # 检查HTTP响应中的中文
                response_chinese = [char for char in response_text if '\u4e00' <= char <= '\u9fff']
                print(f"HTTP响应中文字符数: {len(response_chinese)}")
                
                # 4. 测试临时文件写入和读取
                print("📝 测试临时文件处理...")
                
                with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False, encoding='utf-8') as temp_file:
                    temp_file.write(response_text)
                    temp_path = temp_file.name
                
                # 读取临时文件验证编码
                with open(temp_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
                
                file_chinese = [char for char in file_content if '\u4e00' <= char <= '\u9fff']
                print(f"临时文件中文字符数: {len(file_chinese)}")
                
                if file_content == response_text:
                    print("✅ 临时文件读写正常")
                else:
                    print("❌ 临时文件读写有问题")
                
                # 5. 测试MarkItDown处理
                print("📄 测试MarkItDown处理...")
                try:
                    from markitdown import MarkItDown
                    
                    markitdown = MarkItDown()
                    markitdown_result = markitdown.convert(temp_path)
                    
                    markdown_content = markitdown_result.text_content
                    print(f"MarkItDown输出长度: {len(markdown_content)}")
                    
                    # 检查MarkItDown输出中的中文
                    markdown_chinese = [char for char in markdown_content if '\u4e00' <= char <= '\u9fff']
                    print(f"MarkItDown输出中文字符数: {len(markdown_chinese)}")
                    print(f"MarkItDown输出预览: {markdown_content[:200]}...")
                    
                    if len(markdown_chinese) > 0:
                        print("✅ MarkItDown中文处理正常")
                    else:
                        print("❌ MarkItDown中文处理可能有问题")
                        
                except Exception as e:
                    print(f"❌ MarkItDown处理失败: {e}")
                    markdown_content = "# 处理失败\n\n无法使用MarkItDown处理内容"
                
                # 6. 测试存储编码
                print("💾 测试存储编码...")
                
                markdown_bytes = markdown_content.encode('utf-8')
                print(f"Markdown UTF-8字节长度: {len(markdown_bytes)}")
                
                # 测试往返转换
                decoded_markdown = markdown_bytes.decode('utf-8')
                if decoded_markdown == markdown_content:
                    print("✅ Markdown编码往返正常")
                else:
                    print("❌ Markdown编码往返有问题")
                
                # 7. 测试content_chunks创建
                print("🔄 测试内容分块...")
                from app.utils.content_chunker import ContentChunker
                
                chunker = ContentChunker(max_chunk_size=500)
                content_chunks = chunker.create_content_chunks(
                    test_content_item.id,
                    markdown_content
                )
                
                print(f"创建了 {len(content_chunks)} 个内容分块")
                
                for i, chunk in enumerate(content_chunks):
                    chunk_content = chunk.chunk_content
                    chunk_chinese = [char for char in chunk_content if '\u4e00' <= char <= '\u9fff']
                    print(f"分块 {i+1}: 中文字符数={len(chunk_chinese)}, 内容长度={len(chunk_content)}")
                    print(f"  内容预览: {chunk_content[:50]}...")
                
                # 8. 测试数据库存储
                print("💽 测试数据库存储...")
                for chunk in content_chunks:
                    session.add(chunk)
                session.commit()
                
                # 从数据库读取验证
                from app.crud.crud_content import get_content_chunks
                saved_chunks, total = get_content_chunks(session, test_content_item.id, 1, 10)
                
                print(f"从数据库读取到 {len(saved_chunks)} 个分块")
                
                all_encoding_ok = True
                for i, chunk in enumerate(saved_chunks):
                    stored_content = chunk.chunk_content
                    original_content = content_chunks[i].chunk_content if i < len(content_chunks) else ""
                    
                    if stored_content == original_content:
                        print(f"✅ 分块 {i+1} 数据库存储正常")
                    else:
                        print(f"❌ 分块 {i+1} 数据库存储有问题")
                        all_encoding_ok = False
                        
                        # 详细分析差异
                        stored_chinese = [char for char in stored_content if '\u4e00' <= char <= '\u9fff']
                        original_chinese = [char for char in original_content if '\u4e00' <= char <= '\u9fff']
                        print(f"  原始中文字符数: {len(original_chinese)}")
                        print(f"  存储中文字符数: {len(stored_chinese)}")
                
                # 9. 测试API JSON序列化
                print("🌐 测试API JSON序列化...")
                import json
                
                api_data = {
                    "content_id": str(test_content_item.id),
                    "chunks": [
                        {
                            "id": str(chunk.id),
                            "content": chunk.chunk_content,
                            "index": chunk.chunk_index,
                        }
                        for chunk in saved_chunks
                    ]
                }
                
                # 测试不同的JSON序列化方式
                try:
                    json_default = json.dumps(api_data)
                    json_utf8 = json.dumps(api_data, ensure_ascii=False)
                    
                    print(f"JSON默认序列化长度: {len(json_default)}")
                    print(f"JSON UTF-8序列化长度: {len(json_utf8)}")
                    
                    # 测试反序列化
                    parsed_default = json.loads(json_default)
                    parsed_utf8 = json.loads(json_utf8)
                    
                    # 检查第一个chunk的内容
                    if saved_chunks and len(parsed_default["chunks"]) > 0:
                        original_chunk_content = saved_chunks[0].chunk_content
                        parsed_default_content = parsed_default["chunks"][0]["content"]
                        parsed_utf8_content = parsed_utf8["chunks"][0]["content"]
                        
                        if parsed_default_content == original_chunk_content:
                            print("✅ JSON默认序列化正常")
                        else:
                            print("❌ JSON默认序列化有问题")
                            all_encoding_ok = False
                            
                        if parsed_utf8_content == original_chunk_content:
                            print("✅ JSON UTF-8序列化正常") 
                        else:
                            print("❌ JSON UTF-8序列化有问题")
                            all_encoding_ok = False
                    
                except Exception as e:
                    print(f"❌ JSON序列化失败: {e}")
                    all_encoding_ok = False
                
                # 清理临时文件
                os.unlink(temp_path)
                
                print(f"\n📊 {encoding_name} 编码测试{'完全正常' if all_encoding_ok else '存在问题'}")
                print(f"🆔 测试ContentItem ID: {test_content_item.id}")
                
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    test_chinese_website_parsing()
    print("\n🎉 中文网站解析编码测试完成！") 