#!/usr/bin/env python3
"""
测试网页编码处理逻辑
"""
import tempfile
import os
from app.utils.content_processors import clean_content_for_db, is_gibberish

def test_encoding_processing():
    """测试编码处理逻辑"""
    
    print("🔍 测试网页编码处理逻辑...")
    
    # 模拟中文网站HTML内容
    chinese_html_content = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>中文测试网站</title>
</head>
<body>
    <h1>中文内容测试</h1>
    <p>这是一个包含中文内容的测试网页，用于验证编码处理是否正确。</p>
    <h2>技术术语</h2>
    <ul>
        <li>人工智能（AI）</li>
        <li>机器学习（Machine Learning）</li>
        <li>深度学习（Deep Learning）</li>
        <li>自然语言处理（NLP）</li>
    </ul>
    <p>测试结束。希望所有中文字符都能正确显示。</p>
</body>
</html>"""

    try:
        # 1. 测试不同编码场景
        print("\n📡 测试HTTP响应编码处理...")
        
        # 模拟requests.Response对象
        class MockResponse:
            def __init__(self, content_bytes, encoding='utf-8', content_type=None):
                self._content = content_bytes
                self.encoding = encoding
                self.status_code = 200
                self.headers = {
                    'content-type': content_type or f'text/html; charset={encoding}'
                }

            @property
            def text(self):
                return self._content.decode(self.encoding)
            
            @property
            def content(self):
                return self._content

            def raise_for_status(self):
                pass

        # 测试场景1：正确的UTF-8编码
        print("✅ 场景1: 正确的UTF-8编码")
        utf8_bytes = chinese_html_content.encode('utf-8')
        response_utf8 = MockResponse(utf8_bytes, 'utf-8')
        
        # 模拟content_processors.py中的编码处理逻辑
        html_content = None
        if response_utf8.encoding and response_utf8.encoding.lower() not in ['iso-8859-1', 'latin-1']:
            html_content = response_utf8.text
        else:
            html_content = response_utf8.content.decode('utf-8', errors='replace')
        
        chinese_chars = [char for char in html_content if '\u4e00' <= char <= '\u9fff']
        print(f"  UTF-8处理后中文字符数: {len(chinese_chars)}")
        
        # 测试场景2：错误的latin-1编码声明（实际是UTF-8内容）
        print("✅ 场景2: 错误的latin-1编码声明")
        # 网站声明是latin-1，但实际发送的是UTF-8字节
        response_latin1 = MockResponse(utf8_bytes, 'iso-8859-1')
        
        html_content_latin1 = None
        if response_latin1.encoding and response_latin1.encoding.lower() not in ['iso-8859-1', 'latin-1']:
            html_content_latin1 = response_latin1.text
        else:
            # 直接从字节内容解码UTF-8（这是我们的修复逻辑）
            html_content_latin1 = response_latin1.content.decode('utf-8', errors='replace')
        
        chinese_chars_latin1 = [char for char in html_content_latin1 if '\u4e00' <= char <= '\u9fff']
        print(f"  Latin-1修正后中文字符数: {len(chinese_chars_latin1)}")
        
        # 测试场景3：无编码声明
        print("✅ 场景3: 无编码声明")
        response_no_encoding = MockResponse(utf8_bytes, 'utf-8')
        response_no_encoding.encoding = None
        
        html_content_no_enc = response_no_encoding.content.decode('utf-8', errors='replace')
        chinese_chars_no_enc = [char for char in html_content_no_enc if '\u4e00' <= char <= '\u9fff']
        print(f"  无编码声明处理后中文字符数: {len(chinese_chars_no_enc)}")
        
        # 测试场景4：GBK编码的网站
        print("✅ 场景4: GBK编码网站")
        try:
            gbk_bytes = chinese_html_content.encode('gbk')
            response_gbk = MockResponse(gbk_bytes, 'gbk')
            
            # 模拟编码检测失败，需要尝试多种编码
            html_content_gbk = None
            try:
                if response_gbk.encoding and response_gbk.encoding.lower() not in ['iso-8859-1', 'latin-1']:
                    html_content_gbk = response_gbk.text
                else:
                    html_content_gbk = response_gbk.content.decode('utf-8', errors='replace')
            except UnicodeDecodeError:
                # 尝试其他编码
                encodings_to_try = ['gbk', 'gb2312', 'big5', 'utf-8']
                for encoding in encodings_to_try:
                    try:
                        html_content_gbk = response_gbk.content.decode(encoding)
                        print(f"    🔧 使用 {encoding} 编码成功解码网站内容")
                        break
                    except UnicodeDecodeError:
                        continue
            
            if html_content_gbk:
                chinese_chars_gbk = [char for char in html_content_gbk if '\u4e00' <= char <= '\u9fff']
                print(f"  GBK处理后中文字符数: {len(chinese_chars_gbk)}")
            else:
                print("  ❌ GBK编码处理失败")
                
        except UnicodeEncodeError:
            print("  ⚠️  部分字符无法用GBK编码，跳过GBK测试")
        
        # 2. 测试临时文件处理
        print("\n📝 测试临时文件编码处理...")
        
        with tempfile.NamedTemporaryFile(mode="w", suffix=".html", delete=False, encoding='utf-8') as temp_file:
            temp_file.write(html_content)
            temp_path = temp_file.name
        
        # 验证临时文件
        with open(temp_path, encoding='utf-8') as f:
            file_content = f.read()
        
        file_chinese = [char for char in file_content if '\u4e00' <= char <= '\u9fff']
        print(f"  临时文件中文字符数: {len(file_chinese)}")
        
        if file_content == html_content:
            print("  ✅ 临时文件读写正常")
        else:
            print("  ❌ 临时文件读写有问题")
        
        # 3. 测试MarkItDown处理
        print("\n📄 测试MarkItDown处理...")
        try:
            from markitdown import MarkItDown
            
            markitdown = MarkItDown()
            markitdown_result = markitdown.convert(temp_path)
            
            markdown_content = markitdown_result.text_content
            print(f"  MarkItDown输出长度: {len(markdown_content)}")
            
            # 检查MarkItDown输出中的中文
            markdown_chinese = [char for char in markdown_content if '\u4e00' <= char <= '\u9fff']
            print(f"  MarkItDown输出中文字符数: {len(markdown_chinese)}")
            print(f"  MarkItDown输出预览: {markdown_content[:200]}...")
            
            if len(markdown_chinese) > 0:
                print("  ✅ MarkItDown中文处理正常")
            else:
                print("  ❌ MarkItDown中文处理可能有问题")
            
        except Exception as e:
            print(f"  ❌ MarkItDown处理失败: {e}")
            markdown_content = "# 处理失败\n\n无法使用MarkItDown处理内容"
            markdown_chinese = []
        
        # 4. 测试内容清理
        print("\n🧹 测试内容清理...")
        
        cleaned_content = clean_content_for_db(markdown_content)
        cleaned_chinese = [char for char in cleaned_content if '\u4e00' <= char <= '\u9fff']
        print(f"  清理后中文字符数: {len(cleaned_chinese)}")
        
        if len(cleaned_chinese) == len(markdown_chinese):
            print("  ✅ 内容清理保持中文字符完整")
        else:
            print("  ⚠️  内容清理可能影响了中文字符")
        
        # 5. 测试乱码检测
        print("\n🔍 测试乱码检测...")
        
        is_gibberish_result = is_gibberish(cleaned_content)
        print(f"  乱码检测结果: {'是乱码' if is_gibberish_result else '正常内容'}")
        
        if not is_gibberish_result:
            print("  ✅ 乱码检测正常，中文内容未被误判")
        else:
            print("  ❌ 乱码检测异常，中文内容被误判为乱码")
            
            # 详细分析为什么被判为乱码
            print("  🔍 乱码检测详细分析:")
            control_chars = sum(1 for ch in cleaned_content if ord(ch) < 32 and ch not in '\n\r\t')
            print(f"    - 控制字符比例: {control_chars / len(cleaned_content) * 100:.2f}%")
            
            printable = sum(1 for ch in cleaned_content if 32 <= ord(ch) <= 126 or ch in "\n\r\t" or ord(ch) > 127)
            ratio = printable / len(cleaned_content)
            print(f"    - 可打印字符比例: {ratio * 100:.2f}%")
            
            latin_extended_chars = sum(1 for ch in cleaned_content if 192 <= ord(ch) <= 255)
            print(f"    - 拉丁扩展字符比例: {latin_extended_chars / len(cleaned_content) * 100:.2f}%")
        
        # 6. 测试UTF-8编码
        print("\n💾 测试UTF-8编码...")
        
        markdown_bytes = cleaned_content.encode('utf-8')
        print(f"  UTF-8字节长度: {len(markdown_bytes)}")
        
        # 测试往返转换
        decoded_markdown = markdown_bytes.decode('utf-8')
        if decoded_markdown == cleaned_content:
            print("  ✅ UTF-8编码往返正常")
        else:
            print("  ❌ UTF-8编码往返有问题")
        
        # 清理临时文件
        os.unlink(temp_path)
        
        print("\n🎉 编码处理测试完成！")
        
        # 总结
        print("\n📊 测试总结:")
        print(f"  - 原始HTML中文字符数: {len([char for char in chinese_html_content if '\u4e00' <= char <= '\u9fff'])}")
        print(f"  - MarkItDown处理后中文字符数: {len(markdown_chinese) if 'markdown_chinese' in locals() else 0}")
        print(f"  - 清理后中文字符数: {len(cleaned_chinese) if 'cleaned_chinese' in locals() else 0}")
        print(f"  - 乱码检测: {'通过' if not is_gibberish_result else '失败'}")
        
        # 检查关键指标
        success = True
        if len(chinese_chars) == 0:
            print("  ❌ UTF-8编码处理失败")
            success = False
        if len(chinese_chars_latin1) == 0:
            print("  ❌ Latin-1修正处理失败")
            success = False
        if 'markdown_chinese' in locals() and len(markdown_chinese) == 0:
            print("  ❌ MarkItDown中文处理失败")
            success = False
        if is_gibberish_result:
            print("  ❌ 乱码检测误判")
            success = False
        
        return success
        
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_encoding_processing()
    if success:
        print("\n✅ 所有编码测试通过!")
    else:
        print("\n❌ 编码测试失败!") 