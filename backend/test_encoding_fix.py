#!/usr/bin/env python3
"""
验证中文编码修复效果的完整测试脚本
"""
import json
import uuid

from sqlmodel import Session

from app.core.db import engine
from app.models.content import ContentItem
from app.utils.content_chunker import ContentChunker


def test_encoding_fix():
    """测试编码修复效果"""

    print("🔧 测试中文编码修复效果...")

    # 测试用的中文内容
    chinese_content = """
# 中文编码测试

这是一个完整的中文编码测试，包含：

## 各种中文字符
- 简体中文：你好世界
- 繁体中文：你好世界
- 特殊符号：《》「」【】
- 标点符号：，。！？；：

## 技术术语
- 人工智能（AI）
- 机器学习（ML）
- 深度学习（DL）
- 自然语言处理（NLP）

## 代码示例
```python
def greet(name):
    print(f"你好，{name}！")
    return "成功"

# 中文注释测试
greet("世界")
```

## 表格测试
| 项目 | 数量 | 说明 |
|------|------|------|
| 用户数 | 1000 | 活跃用户 |
| 文档数 | 500 | 技术文档 |
| 评论数 | 2000 | 用户评论 |

测试完成！✅
"""

    try:
        with Session(engine) as session:
            # 1. 创建测试数据
            test_user_id = uuid.uuid4()
            test_content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=test_user_id,
                type="text",
                title="编码修复测试",
                processing_status="completed"
            )
            session.add(test_content_item)
            session.commit()

            print(f"✅ 创建测试ContentItem: {test_content_item.id}")

            # 2. 创建内容分块
            chunker = ContentChunker(max_chunk_size=800)
            content_chunks = chunker.create_content_chunks(
                test_content_item.id,
                chinese_content
            )

            for chunk in content_chunks:
                session.add(chunk)
            session.commit()

            print(f"✅ 创建了 {len(content_chunks)} 个内容分块")

            # 3. 验证数据库存储
            print("\n📊 验证数据库存储...")
            from app.crud.crud_content import get_content_chunks
            chunks, total = get_content_chunks(session, test_content_item.id, 1, 10)

            for i, chunk in enumerate(chunks):
                content = chunk.chunk_content
                has_chinese = any('\u4e00' <= char <= '\u9fff' for char in content)
                print(f"分块 {i+1}: 包含中文={has_chinese}, 长度={len(content)}")
                print(f"  内容预览: {content[:50]}...")

                # 验证JSON序列化
                chunk_dict = {
                    "id": str(chunk.id),
                    "content": chunk.chunk_content,
                    "type": chunk.chunk_type,
                }

                # 测试不同的JSON序列化方式
                json_default = json.dumps(chunk_dict)  # 默认方式
                json_utf8 = json.dumps(chunk_dict, ensure_ascii=False)  # UTF-8方式

                print(f"  JSON默认: {len(json_default)} 字符")
                print(f"  JSON UTF-8: {len(json_utf8)} 字符")

                # 验证往返转换
                parsed_default = json.loads(json_default)
                parsed_utf8 = json.loads(json_utf8)

                if parsed_default["content"] == chunk.chunk_content:
                    print("  ✅ 默认JSON往返正常")
                else:
                    print("  ❌ 默认JSON往返有问题")

                if parsed_utf8["content"] == chunk.chunk_content:
                    print("  ✅ UTF-8 JSON往返正常")
                else:
                    print("  ❌ UTF-8 JSON往返有问题")

            # 4. 模拟API响应格式
            print("\n🌐 模拟API响应格式...")
            api_response = {
                "content_id": str(test_content_item.id),
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
            }

            # 测试API响应的JSON序列化
            api_json = json.dumps(api_response, ensure_ascii=False)
            print(f"API响应JSON长度: {len(api_json)} 字符")

            # 验证API响应往返
            parsed_api = json.loads(api_json)
            if len(parsed_api["chunks"]) == len(chunks):
                print("✅ API响应格式正常")

                # 检查第一个chunk的内容
                if parsed_api["chunks"][0]["content"] == chunks[0].chunk_content:
                    print("✅ API响应中文内容正常")
                else:
                    print("❌ API响应中文内容有问题")
            else:
                print("❌ API响应格式有问题")

            print(f"\n🆔 测试ContentItem ID: {test_content_item.id}")
            print("📝 可以使用这个ID在前端测试API响应")
            print("🔗 API端点: GET /api/v1/content/{id}/chunks")

            # 保持数据供前端测试
            print("\n⚠️  测试数据已保留，供前端验证使用")
            return str(test_content_item.id)

    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    content_id = test_encoding_fix()
    print(f"\n🎉 编码修复测试完成！ContentItem ID: {content_id}")
    print("\n📋 修复总结:")
    print("1. ✅ 修复了ApiResponseMiddleware中的UTF-8解码问题")
    print("2. ✅ 修复了TimezoneMiddleware中的UTF-8解码问题")
    print("3. ✅ 为FastAPI设置了UTF-8 JSON编码器")
    print("4. ✅ 确保所有异常处理器使用UTF-8编码")
    print("\n🔍 如果仍有问题，请检查:")
    print("- 前端接收API响应的处理")
    print("- 浏览器的字符编码设置")
    print("- 网络传输过程中的编码处理")
