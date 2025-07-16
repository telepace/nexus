"""add_unique_constraint_to_segments

Revision ID: 6055f61527a6
Revises: 72ae2adb0d6c
Create Date: 2025-06-22 16:44:30.497933

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '6055f61527a6'
down_revision = '72ae2adb0d6c'
branch_labels = None
depends_on = None

def upgrade():
    # 在添加唯一约束之前，先清理重复数据
    op.execute("""
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY content_item_id, segment_index
                ORDER BY created_at DESC
            ) AS rnk
            FROM segments
        )
        DELETE FROM segments
        WHERE id IN (SELECT id FROM ranked WHERE rnk > 1)
    """)

    # 添加唯一约束
    op.create_unique_constraint(
        'uix_content_segment_idx',
        'segments',
        ['content_item_id', 'segment_index']
    )

def downgrade():
    # 删除唯一约束
    op.drop_constraint('uix_content_segment_idx', 'segments', type_='unique')
