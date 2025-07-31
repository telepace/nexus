#!/usr/bin/env python3
"""
迁移脚本：将现有的 segments 数据迁移到新的 content_segments 表中
这个脚本会：
1. 从 segments 表读取数据
2. 将数据转换并插入到 content_segments 表
3. 保持向后兼容
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import uuid

from sqlalchemy import func, text
from sqlmodel import Session, select

from app.core.db_factory import engine
from app.models.content import Segment
from app.models.segments import ContentSegment


def migrate_segments_to_content_segments():
    """迁移 segments 表数据到 content_segments 表"""
    print("🚀 开始迁移 segments 数据到 content_segments...")

    with Session(engine) as session:
        # 检查是否已有数据
        existing_count = session.scalar(select(func.count(ContentSegment.id)))
        if existing_count > 0:
            print(f"⚠️  content_segments 表中已有 {existing_count} 条数据")
            response = input("是否继续迁移？这将跳过重复数据 (y/N): ")
            if response.lower() not in ['y', 'yes']:
                print("❌ 迁移已取消")
                return

        # 获取所有待迁移的 segments
        segments = session.exec(select(Segment)).all()
        print(f"📊 找到 {len(segments)} 条 segments 数据")

        if not segments:
            print("✅ 没有数据需要迁移")
            return

        # 使用原生SQL进行批量插入，利用 ON CONFLICT DO NOTHING 避免重复
        try:
            migrated_count = 0
            batch_size = 100

            for i in range(0, len(segments), batch_size):
                batch = segments[i:i + batch_size]

                # 准备批量插入的数据
                values_list = []
                for segment in batch:
                    values_list.append({
                        'id': uuid.uuid4(),
                        'content_item_id': segment.content_item_id,
                        'display_number': segment.display_number,
                        'content': segment.content,
                        'start_offset': None,
                        'end_offset': None,
                        'created_at': segment.created_at,
                        'updated_at': segment.created_at,
                    })

                # 使用原生SQL执行批量插入
                insert_stmt = text("""
                    INSERT INTO content_segments (id, content_item_id, display_number, content, start_offset, end_offset, created_at, updated_at)
                    VALUES (:id, :content_item_id, :display_number, :content, :start_offset, :end_offset, :created_at, :updated_at)
                    ON CONFLICT (content_item_id, display_number) DO NOTHING
                """)

                session.execute(insert_stmt, values_list)
                session.commit()

                migrated_count += len(batch)
                print(f"✅ 已处理 {migrated_count}/{len(segments)} 条记录...")

            # 检查实际插入的数据量
            final_count = session.scalar(select(func.count(ContentSegment.id)))
            new_records = final_count - existing_count

            print("🎉 迁移完成！")
            print(f"   • 处理记录数: {migrated_count}")
            print(f"   • 新增记录数: {new_records}")
            print(f"   • 跳过重复数: {migrated_count - new_records}")

        except Exception as e:
            session.rollback()
            print(f"❌ 迁移失败: {e}")
            raise


def create_segment_population_function():
    """创建一个函数，用于在内容处理时自动填充 content_segments 表"""

    function_sql = """
    CREATE OR REPLACE FUNCTION populate_content_segments_from_segments()
    RETURNS TRIGGER AS $$
    BEGIN
        -- 当插入新的 segment 时，同时插入到 content_segments
        INSERT INTO content_segments (
            id,
            content_item_id,
            display_number,
            content,
            start_offset,
            end_offset,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            NEW.content_item_id,
            NEW.display_number,
            NEW.content,
            NULL, -- segments 表中没有 offset 信息
            NULL,
            NEW.created_at,
            COALESCE(NEW.created_at, NOW())
        )
        ON CONFLICT (content_item_id, display_number) DO NOTHING; -- 避免重复

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- 创建触发器
    DROP TRIGGER IF EXISTS trigger_populate_content_segments ON segments;
    CREATE TRIGGER trigger_populate_content_segments
        AFTER INSERT ON segments
        FOR EACH ROW
        EXECUTE FUNCTION populate_content_segments_from_segments();
    """

    with Session(engine) as session:
        print("🔧 创建自动同步触发器...")
        session.exec(text(function_sql))
        session.commit()
        print("✅ 触发器创建完成")


def main():
    """主函数"""
    print("=" * 60)
    print("📦 Segments to ContentSegments 迁移工具")
    print("=" * 60)

    try:
        # 执行数据迁移
        migrate_segments_to_content_segments()

        # 创建自动同步机制
        create_segment_population_function()

        print("\n🎯 迁移总结:")
        print("✅ 历史数据已迁移到 content_segments 表")
        print("✅ 创建了自动同步触发器")
        print("✅ 新的段落引用系统已准备就绪")
        print("\n💡 提示:")
        print("- 前端现在可以使用新的段落 API 进行毫秒级查询")
        print("- 引用指示器将显示精确的段落内容预览")
        print("- 系统将自动保持两个表的数据同步")

    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
