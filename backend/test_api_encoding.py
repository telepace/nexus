#!/usr/bin/env python3
"""
测试API层面的中文编码问题
"""
import json
import requests
from test_chinese_encoding import test_chinese_encoding

def test_api_encoding():
    """测试API层面的编码"""
    
    # 先运行数据库编码测试，确保有测试数据
    print("🔧 准备测试数据...")
    
    # 创建实际的测试数据（不清理）
    import uuid
    from sqlmodel import Session
    from app.core.db import engine
    from app.models.content import ContentChunk, ContentItem
    from app.utils.content_chunker import ContentChunker

    chinese_content = """
# 中文测试标题

这是一段中文测试内容，包含各种中文字符：

## 技术文档
- 人工智能技术发展  
- 机器学习算法优化
- 深度学习模型训练

特殊字符测试："你好世界"，编码测试。

```python
# 中文注释
def hello():
    print("你好")
    return "成功"
```

| 项目 | 数量 | 说明 |
|------|------|------|  
| 用户数 | 1000 | 活跃用户 |
| 文档数 | 500 | 技术文档 |
"""

    try:
        with Session(engine) as session:
            # 创建测试数据
            test_user_id = uuid.uuid4()
            test_content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=test_user_id,
                type="text",
                title="API编码测试",
                processing_status="completed"
            )
            session.add(test_content_item)
            session.commit()
            
            # 创建chunks
            chunker = ContentChunker(max_chunk_size=500)
            content_chunks = chunker.create_content_chunks(
                test_content_item.id, 
                chinese_content
            )
            
            for chunk in content_chunks:
                session.add(chunk)
            session.commit()
            
            print(f"✅ 创建了测试ContentItem: {test_content_item.id}")
            print(f"✅ 创建了 {len(content_chunks)} 个chunks")
            
            # 测试直接从数据库查询
            print("\n📖 直接从数据库查询测试...")
            from app.crud.crud_content import get_content_chunks
            chunks, total = get_content_chunks(session, test_content_item.id, 1, 10)
            
            print(f"查询到 {len(chunks)} 个chunks")
            for i, chunk in enumerate(chunks):
                print(f"Chunk {i+1}: {chunk.chunk_content[:50]}...")
                
                # 检查编码
                content = chunk.chunk_content
                has_chinese = any('\u4e00' <= char <= '\u9fff' for char in content)
                print(f"  - 包含中文: {has_chinese}")
                
                # 测试JSON序列化
                try:
                    chunk_dict = {
                        "id": str(chunk.id),
                        "index": chunk.chunk_index,
                        "content": chunk.chunk_content,
                        "type": chunk.chunk_type,
                        "word_count": chunk.word_count,
                        "char_count": chunk.char_count,
                    }
                    json_str = json.dumps(chunk_dict, ensure_ascii=False)
                    print(f"  - JSON序列化成功: {len(json_str)} 字符")
                    
                    # 测试反序列化
                    parsed = json.loads(json_str)
                    if parsed["content"] == chunk.chunk_content:
                        print("  - ✅ JSON往返转换正常")
                    else:
                        print("  - ❌ JSON往返转换有问题")
                        
                except Exception as e:
                    print(f"  - ❌ JSON序列化失败: {e}")
            
            print(f"\n🆔 测试ContentItem ID: {test_content_item.id}")
            print("📝 请在前端使用这个ID测试API响应")
            print("🔗 API端点: GET /api/v1/content/{id}/chunks")
            
            # 保持数据不删除，供前端测试使用
            print("\n⚠️  测试数据已保留，请手动清理")
            return str(test_content_item.id)
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    content_id = test_api_encoding()
    print(f"\n🎉 API编码测试完成！ContentItem ID: {content_id}") 