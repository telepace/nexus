"""remove_processing_job_table

Revision ID: remove_processing_job_001
Revises: phase2_001
Create Date: 2025-01-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'remove_processing_job_001'
down_revision = 'phase2_001'
branch_labels = None
depends_on = None


def upgrade():
    """移除 ProcessingJob 表并增强 ContentItem 表"""
    
    # 阶段1: 为 ContentItem 表添加新字段
    op.add_column('contentitem', sa.Column('last_processed_at', sa.DateTime(), nullable=True))
    
    # 注意: error_message 字段在原来的 ContentItem 中已经存在，所以这里不需要添加
    
    # 阶段2: 数据迁移 - 将 ProcessingJob 中的关键信息迁移到 ContentItem
    # 只迁移最新的失败记录的错误信息
    op.execute("""
        UPDATE contentitem 
        SET 
            error_message = COALESCE(pj.error_message, contentitem.error_message),
            last_processed_at = COALESCE(pj.completed_at, pj.started_at, NOW())
        FROM (
            SELECT DISTINCT ON (content_item_id) 
                content_item_id, 
                error_message, 
                completed_at,
                started_at
            FROM processingjob 
            ORDER BY content_item_id, created_at DESC
        ) pj
        WHERE contentitem.id = pj.content_item_id;
    """)
    
    # 阶段3: 删除 ProcessingJob 表的外键约束
    op.drop_constraint('processingjob_content_item_id_fkey', 'processingjob', type_='foreignkey')
    
    # 阶段4: 删除索引
    op.drop_index('ix_processingjob_content_item_id', table_name='processingjob')
    op.drop_index('ix_processingjob_id', table_name='processingjob')
    op.drop_index('ix_processingjob_processor_name', table_name='processingjob')
    op.drop_index('ix_processingjob_status', table_name='processingjob')
    
    # 阶段5: 删除 ProcessingJob 表
    op.drop_table('processingjob')


def downgrade():
    """恢复 ProcessingJob 表（如果需要回滚）"""
    
    # 重新创建 ProcessingJob 表
    op.create_table('processingjob',
        sa.Column('content_item_id', sa.Uuid(), nullable=False),
        sa.Column('processor_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('error_message', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')"),
        sa.ForeignKeyConstraint(['content_item_id'], ['contentitem.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 重新创建索引
    op.create_index('ix_processingjob_content_item_id', 'processingjob', ['content_item_id'], unique=False)
    op.create_index('ix_processingjob_id', 'processingjob', ['id'], unique=False)
    op.create_index('ix_processingjob_processor_name', 'processingjob', ['processor_name'], unique=False)
    op.create_index('ix_processingjob_status', 'processingjob', ['status'], unique=False)
    
    # 移除从 ContentItem 添加的字段
    op.drop_column('contentitem', 'last_processed_at') 