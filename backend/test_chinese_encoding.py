#!/usr/bin/env python3
"""
测试中文内容在 ContentChunk 中的存储和读取
"""
import uuid
from sqlmodel import Session, select, text
from app.core.db import engine
from app.models.content import ContentChunk, ContentItem
from app.utils.content_chunker import ContentChunker

def test_chinese_encoding():
    """测试中文编码问题"""
    
    # 测试用的中文内容
    chinese_content = """
# 中文测试标题

这是一段中文测试内容，包含各种中文字符：

## 技术文档
- 人工智能技术发展
- 机器学习算法优化
- 深度学习模型训练

这里有一些特殊字符："你好世界"，测试编码是否正确。

```python
# 代码块中的中文注释
def hello_world():
    print("你好，世界！")  # 打印中文
    return "成功"
```

## 数据统计
| 项目 | 数量 | 说明 |
|------|------|------|
| 用户数 | 1000 | 活跃用户 |
| 文档数 | 500 | 技术文档 |

测试完成。
"""
    
    print("🔍 开始测试中文编码...")
    print(f"原始内容长度: {len(chinese_content)} 字符")
    print(f"原始内容(前100字符): {chinese_content[:100]}...")
    
    try:
        with Session(engine) as session:
            # 1. 首先检查数据库连接的编码设置
            print("\n📊 检查数据库编码设置...")
            result = session.exec(select(1)).first()
            print(f"数据库连接正常: {result}")
            
            # 检查数据库编码
            encoding_result = session.exec(
                text("SELECT name, setting FROM pg_settings WHERE name LIKE '%encoding%' OR name LIKE '%locale%'")
            ).all()
            
            print("数据库编码设置:")
            for row in encoding_result:
                print(f"  {row[0]}: {row[1]}")
            
            # 2. 创建一个测试用的 ContentItem (如果不存在)
            test_user_id = uuid.uuid4()
            test_content_item = ContentItem(
                id=uuid.uuid4(),
                user_id=test_user_id,
                type="text",
                title="中文编码测试",
                processing_status="completed"
            )
            session.add(test_content_item)
            session.commit()
            
            # 3. 使用 ContentChunker 分块中文内容
            print("\n🔄 使用 ContentChunker 分块中文内容...")
            chunker = ContentChunker(max_chunk_size=500)
            content_chunks = chunker.create_content_chunks(
                test_content_item.id, 
                chinese_content
            )
            
            print(f"生成了 {len(content_chunks)} 个内容分块")
            
            # 检查内存中的分块内容
            print("\n🧠 检查内存中的分块内容...")
            for i, chunk in enumerate(content_chunks):
                chunk_content = chunk.chunk_content
                has_chinese = any('\u4e00' <= char <= '\u9fff' for char in chunk_content)
                print(f"分块 {i+1}: 有中文={has_chinese}, 内容长度={len(chunk_content)}")
                print(f"  内容: {chunk_content[:50]}...")
            
            # 4. 保存到数据库
            print("\n💾 保存到数据库...")
            for chunk in content_chunks:
                session.add(chunk)
            session.commit()
            
            print("✅ 内容分块保存成功")
            
            # 5. 从数据库读取并验证
            print("\n📖 从数据库读取并验证...")
            saved_chunks = session.exec(
                select(ContentChunk)
                .where(ContentChunk.content_item_id == test_content_item.id)
                .order_by(ContentChunk.chunk_index)
            ).all()
            
            print(f"从数据库读取到 {len(saved_chunks)} 个分块")
            
            # 6. 验证每个分块的内容
            original_chunks = []
            for chunk in content_chunks:
                original_chunks.append(chunk.chunk_content)
            
            for i, chunk in enumerate(saved_chunks):
                print(f"\n--- 分块 {i+1} ({chunk.chunk_type}) ---")
                print(f"字符数: {chunk.char_count}")
                print(f"词数: {chunk.word_count}")
                
                stored_content = chunk.chunk_content
                original_content = original_chunks[i] if i < len(original_chunks) else ""
                
                print(f"原始内容: {original_content[:50]}...")
                print(f"存储内容: {stored_content[:50]}...")
                
                # 比较内容是否一致
                if stored_content == original_content:
                    print("✅ 内容完全一致，编码正常")
                else:
                    print("❌ 内容不一致，可能存在编码问题")
                    print(f"原始长度: {len(original_content)}, 存储长度: {len(stored_content)}")
                    
                    # 逐字符比较，找出差异
                    for j, (orig_char, stored_char) in enumerate(zip(original_content, stored_content)):
                        if orig_char != stored_char:
                            print(f"  差异位置 {j}: 原始='{orig_char}' (U+{ord(orig_char):04X}), 存储='{stored_char}' (U+{ord(stored_char):04X})")
                            if j >= 5:  # 只显示前5个差异
                                break
            
            # 7. 清理测试数据
            print("\n🧹 清理测试数据...")
            for chunk in saved_chunks:
                session.delete(chunk)
            session.delete(test_content_item)
            session.commit()
            print("✅ 测试数据清理完成")
            
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    test_chinese_encoding()
    print("\n🎉 中文编码测试完成！") 