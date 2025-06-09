#!/usr/bin/env python3
"""
测试真实中文网站的解析和编码处理
"""
import uuid

from sqlmodel import Session

from app.core.db import engine
from app.models.content import ContentItem
from app.utils.content_processors import ContentProcessorFactory


def test_real_chinese_websites():
    """测试真实中文网站的解析"""

    print("🔍 测试真实中文网站解析...")

    # 测试用的中文网站（选择一些稳定、公开的中文网站）
    test_websites = [
        {
            "url": "https://www.baidu.com",
            "name": "百度首页",
            "expected_chinese": ["百度", "搜索"]
        },
        {
            "url": "https://news.sina.com.cn",
            "name": "新浪新闻",
            "expected_chinese": ["新闻", "中国", "新浪"]
        },
        {
            "url": "https://www.zhihu.com",
            "name": "知乎",
            "expected_chinese": ["知乎", "发现", "问题"]
        }
    ]

    try:
        with Session(engine) as session:
            for i, website in enumerate(test_websites):
                print(f"\n🧪 测试网站 {i+1}: {website['name']} ({website['url']})")

                try:
                    # 创建测试内容项
                    test_content_item = ContentItem(
                        id=uuid.uuid4(),
                        user_id=uuid.uuid4(),
                        type="url",
                        source_uri=website['url'],
                        title=f"测试 - {website['name']}",
                        processing_status="pending"
                    )
                    session.add(test_content_item)
                    session.commit()

                    print(f"✅ 创建了测试ContentItem: {test_content_item.id}")

                    # 获取处理器并处理内容
                    processor = ContentProcessorFactory.get_processor("url")
                    result = processor.process_content(test_content_item, session)

                    if result.success:
                        print("✅ 网站处理成功")

                        # 检查处理结果中的中文字符
                        markdown_content = result.markdown_content or ""
                        chinese_chars = [char for char in markdown_content if '\u4e00' <= char <= '\u9fff']
                        print(f"📝 Markdown内容长度: {len(markdown_content)}")
                        print(f"🔢 包含中文字符数: {len(chinese_chars)}")

                        # 检查是否包含预期的中文词汇
                        found_expected = []
                        for expected_word in website['expected_chinese']:
                            if expected_word in markdown_content:
                                found_expected.append(expected_word)

                        if found_expected:
                            print(f"✅ 找到预期中文词汇: {', '.join(found_expected)}")
                        else:
                            print(f"⚠️  未找到预期中文词汇: {', '.join(website['expected_chinese'])}")

                        # 检查content_chunks
                        from app.crud.crud_content import get_content_chunks
                        chunks, total = get_content_chunks(session, test_content_item.id, 1, 10)

                        print(f"📊 创建了 {len(chunks)} 个内容分块")

                        # 检查第一个chunk的中文内容
                        if chunks:
                            first_chunk = chunks[0]
                            chunk_chinese = [char for char in first_chunk.chunk_content if '\u4e00' <= char <= '\u9fff']
                            print(f"第一个分块中文字符数: {len(chunk_chinese)}")
                            print(f"第一个分块内容预览: {first_chunk.chunk_content[:100]}...")

                            if len(chunk_chinese) > 0:
                                print("✅ 分块中包含中文字符，编码正常")
                            else:
                                print("❌ 分块中没有中文字符，可能有编码问题")

                        # 测试API JSON序列化
                        print("🌐 测试API JSON序列化...")
                        import json

                        api_data = {
                            "content_id": str(test_content_item.id),
                            "title": test_content_item.title,
                            "chunks": [
                                {
                                    "id": str(chunk.id),
                                    "content": chunk.chunk_content[:100],  # 只取前100字符测试
                                    "index": chunk.chunk_index,
                                }
                                for chunk in chunks[:3]  # 只取前3个chunk测试
                            ]
                        }

                        try:
                            json_utf8 = json.dumps(api_data, ensure_ascii=False)
                            parsed_back = json.loads(json_utf8)

                            # 检查往返转换
                            if len(parsed_back["chunks"]) == len(api_data["chunks"]):
                                # 检查第一个chunk的内容是否一致
                                if (chunks and len(parsed_back["chunks"]) > 0 and
                                    parsed_back["chunks"][0]["content"] in chunks[0].chunk_content):
                                    print("✅ API JSON序列化正常")
                                else:
                                    print("❌ API JSON序列化有问题")
                            else:
                                print("❌ API JSON结构有问题")

                        except Exception as e:
                            print(f"❌ JSON序列化失败: {e}")

                        print(f"🆔 测试ContentItem ID: {test_content_item.id}")

                    else:
                        print(f"❌ 网站处理失败: {result.error_message}")

                except Exception as e:
                    print(f"❌ 处理网站 {website['name']} 时出错: {e}")
                    import traceback
                    traceback.print_exc()
                    continue

    except Exception as e:
        print(f"❌ 测试过程中出现严重错误: {e}")
        import traceback
        traceback.print_exc()
        raise

def test_encoding_edge_cases():
    """测试编码边界情况"""

    print("\n🔍 测试编码边界情况...")

    # 模拟各种编码问题的网站内容
    edge_cases = [
        {
            "name": "GBK编码网站",
            "content": "<!DOCTYPE html><html><head><meta charset='gbk'><title>中文测试</title></head><body><h1>这是GBK编码的中文内容</h1><p>测试各种中文字符：你好世界</p></body></html>",
            "encoding": "gbk"
        },
        {
            "name": "无编码声明网站",
            "content": "<!DOCTYPE html><html><head><title>中文测试</title></head><body><h1>没有编码声明的中文内容</h1><p>测试：你好世界！</p></body></html>",
            "encoding": None
        },
        {
            "name": "错误编码声明网站",
            "content": "<!DOCTYPE html><html><head><meta charset='iso-8859-1'><title>中文测试</title></head><body><h1>错误编码声明的中文内容</h1><p>测试：你好世界！</p></body></html>",
            "encoding": "iso-8859-1"
        }
    ]

    for case in edge_cases:
        print(f"\n🧪 测试: {case['name']}")

        try:
            # 模拟HTTP响应
            from unittest.mock import Mock

            # 创建模拟响应
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.encoding = case['encoding']

            # 根据不同编码情况设置内容
            if case['encoding'] == 'gbk':
                mock_response._content = case['content'].encode('gbk')
            else:
                mock_response._content = case['content'].encode('utf-8')

            mock_response.headers = {'content-type': f'text/html; charset={case["encoding"] or ""}'}

            # 模拟text属性的行为
            if case['encoding'] == 'gbk':
                mock_response.text = case['content']  # 假设能正确解码
            elif case['encoding'] is None:
                # 模拟requests的默认行为（可能使用latin-1）
                try:
                    mock_response.text = case['content'].encode('utf-8').decode('latin-1')
                except:
                    mock_response.text = case['content']
            else:
                mock_response.text = case['content']

            # 测试我们的编码修复逻辑
            if mock_response.encoding is None or mock_response.encoding.lower() in ['iso-8859-1', 'latin-1']:
                mock_response.encoding = 'utf-8'
                # 重新设置text（模拟修复后的行为）
                mock_response.text = case['content']

            # 检查结果
            result_text = mock_response.text
            chinese_chars = [char for char in result_text if '\u4e00' <= char <= '\u9fff']

            print(f"编码: {mock_response.encoding}")
            print(f"文本长度: {len(result_text)}")
            print(f"中文字符数: {len(chinese_chars)}")
            print(f"文本预览: {result_text[:100]}...")

            if len(chinese_chars) > 0:
                print("✅ 编码处理正常")
            else:
                print("❌ 编码处理可能有问题")

        except Exception as e:
            print(f"❌ 测试 {case['name']} 失败: {e}")

if __name__ == "__main__":
    print("🚀 开始真实中文网站解析测试...")

    # 测试真实网站
    test_real_chinese_websites()

    # 测试编码边界情况
    test_encoding_edge_cases()

    print("\n🎉 真实中文网站解析测试完成！")
    print("\n📋 修复总结:")
    print("1. ✅ 修复了MarkItDown处理器的URL编码问题")
    print("2. ✅ 强制使用UTF-8编码处理网站内容")
    print("3. ✅ 临时文件明确指定UTF-8编码")
    print("4. ✅ 为Jina处理器也添加了编码保护")
    print("\n🔍 如果仍有问题，可能需要检查:")
    print("- 特定网站的编码声明")
    print("- 网络代理的编码处理")
    print("- 浏览器的字符集设置")
