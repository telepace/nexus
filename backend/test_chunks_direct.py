#!/usr/bin/env python3
"""
直接测试chunks API的脚本，绕过认证问题
"""

import uuid

from sqlmodel import Session

from app.core.db_factory import engine
from app.crud.crud_content import get_content_chunks


def test_chunks_direct():
    """直接测试chunks数据获取"""

    content_id = uuid.UUID('3ec1d1d9-e59c-4b9b-b161-915677b8c908')

    print(f"🔍 测试内容ID: {content_id}")

    with Session(engine) as session:
        try:
            # 测试get_content_chunks函数
            chunks, total_count = get_content_chunks(
                session=session,
                content_item_id=content_id,
                page=1,
                size=3
            )

            print(f"✅ 获取到 {len(chunks)} 个chunks，总数: {total_count}")

            # 模拟API响应格式转换
            chunk_data = []
            for chunk in chunks:
                chunk_info = {
                    "id": str(chunk.id),
                    "index": chunk.segment_index,
                    "content": chunk.content[:100] + "..." if len(chunk.content) > 100 else chunk.content,
                    "type": chunk.segment_type,
                    "word_count": chunk.word_count,
                    "char_count": chunk.char_count,
                    "created_at": chunk.created_at.isoformat(),
                }
                chunk_data.append(chunk_info)

                print(f"\n📄 Chunk {chunk.segment_index}:")
                print(f"   ID: {chunk.id}")
                print(f"   Type: {chunk.segment_type}")
                print(f"   Content: {repr(chunk.content[:50])}...")
                print(f"   Length: {len(chunk.content)} chars")

            # 模拟完整API响应
            api_response = {
                "content_id": str(content_id),
                "chunks": chunk_data,
                "pagination": {
                    "page": 1,
                    "size": 3,
                    "total_chunks": total_count,
                    "total_pages": (total_count + 3 - 1) // 3,
                    "has_next": 3 < total_count,
                    "has_prev": False,
                },
                "summary": {
                    "total_chunks": total_count,
                    "total_words": sum(chunk.word_count or 0 for chunk in chunks),
                    "total_chars": sum(chunk.char_count or 0 for chunk in chunks),
                    "max_index": max(chunk.segment_index for chunk in chunks) if chunks else 0,
                }
            }

            print("\n📊 模拟API响应结构:")
            print(f"   content_id: {api_response['content_id']}")
            print(f"   chunks: {len(api_response['chunks'])} 个")
            print(f"   pagination: {api_response['pagination']}")
            print(f"   summary: {api_response['summary']}")

            return True

        except Exception as e:
            print(f"❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    print("🚀 开始测试chunks数据获取...")
    success = test_chunks_direct()
    if success:
        print("\n✅ 测试成功！chunks数据可以正确获取。")
        print("💡 问题可能在前端认证或API调用层面。")
    else:
        print("\n❌ 测试失败！问题在后端数据层面。")
