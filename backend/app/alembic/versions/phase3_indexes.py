"""phase3_add_performance_indexes

Revision ID: phase3_001
Revises: phase2_001
Create Date: 2025-06-20 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'phase3_001'
down_revision = 'phase2_001'
branch_labels = None
depends_on = None


def upgrade():
    """Phase 3: 添加性能优化索引"""
    
    # 1. 为 ai_results 表的 JSONB 字段添加 GIN 索引
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_results_summary_gin ON ai_results USING GIN (summary)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_results_key_points_gin ON ai_results USING GIN (key_points)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_results_labels_gin ON ai_results USING GIN (labels)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_ai_results_content_analysis_gin ON ai_results USING GIN (content_analysis)")
    
    # 2. 为 segments 表添加复合索引
    op.create_index(
        'ix_segments_content_item_segment_type', 
        'segments', 
        ['content_item_id', 'segment_type']
    )
    
    op.create_index(
        'ix_segments_content_item_segment_index', 
        'segments', 
        ['content_item_id', 'segment_index']
    )
    
    # 3. 为 ai_results 表添加复合索引
    op.create_index(
        'ix_ai_results_difficulty_quality', 
        'ai_results', 
        ['difficulty_level', 'content_quality_score']
    )
    
    # 4. 为 contentitem 表添加复合索引（如果不存在）
    op.create_index(
        'ix_contentitem_user_status', 
        'contentitem', 
        ['user_id', 'processing_status']
    )
    
    op.create_index(
        'ix_contentitem_project_status', 
        'contentitem', 
        ['project_id', 'processing_status']
    )


def downgrade():
    """回滚 Phase 3 索引"""
    
    # 删除 GIN 索引
    op.execute("DROP INDEX IF EXISTS ix_ai_results_summary_gin")
    op.execute("DROP INDEX IF EXISTS ix_ai_results_key_points_gin")
    op.execute("DROP INDEX IF EXISTS ix_ai_results_labels_gin")
    op.execute("DROP INDEX IF EXISTS ix_ai_results_content_analysis_gin")
    
    # 删除复合索引
    op.drop_index('ix_segments_content_item_segment_type', table_name='segments')
    op.drop_index('ix_segments_content_item_segment_index', table_name='segments')
    op.drop_index('ix_ai_results_difficulty_quality', table_name='ai_results')
    op.drop_index('ix_contentitem_user_status', table_name='contentitem')
    op.drop_index('ix_contentitem_project_status', table_name='contentitem')
