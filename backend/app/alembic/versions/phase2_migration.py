"""phase2_add_ai_results_and_segments_tables

Revision ID: phase2_001
Revises: phase1_001
Create Date: 2025-06-20 18:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'phase2_001'
down_revision = 'phase1_001'
branch_labels = None
depends_on = None


def upgrade():
    """Phase 2: 创建ai_results和segments表，移除冗余字段"""
    
    # 1. 创建 ai_results 表
    op.create_table('ai_results',
        sa.Column('content_item_id', sa.Uuid(), nullable=False),
        sa.Column('summary', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('key_points', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('labels', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('content_analysis', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('reading_time_minutes', sa.Integer(), nullable=True),
        sa.Column('difficulty_level', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('content_quality_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.CheckConstraint("difficulty_level IN ('beginner', 'intermediate', 'advanced')"),
        sa.ForeignKeyConstraint(['content_item_id'], ['contentitem.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('content_item_id')
    )
    op.create_index(op.f('ix_ai_results_content_item_id'), 'ai_results', ['content_item_id'], unique=True)
    op.create_index(op.f('ix_ai_results_id'), 'ai_results', ['id'], unique=False)
    
    # 2. 创建 segments 表（重构自 contentchunk）
    op.create_table('segments',
        sa.Column('content_item_id', sa.Uuid(), nullable=False),
        sa.Column('segment_index', sa.Integer(), nullable=False),
        sa.Column('content', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('segment_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('word_count', sa.Integer(), nullable=False),
        sa.Column('char_count', sa.Integer(), nullable=False),
        sa.Column('meta_info', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.CheckConstraint("segment_type IN ('heading', 'paragraph', 'code_block', 'table', 'list')"),
        sa.ForeignKeyConstraint(['content_item_id'], ['contentitem.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_segments_content_item_id'), 'segments', ['content_item_id'], unique=False)
    op.create_index(op.f('ix_segments_id'), 'segments', ['id'], unique=False)
    op.create_index(op.f('ix_segments_segment_index'), 'segments', ['segment_index'], unique=False)
    op.create_index(op.f('ix_segments_segment_type'), 'segments', ['segment_type'], unique=False)
    
    # 3. 迁移 contentchunk 数据到 segments 表
    op.execute("""
        INSERT INTO segments (
            id, content_item_id, segment_index, content, segment_type, 
            word_count, char_count, meta_info, created_at
        )
        SELECT 
            id, content_item_id, chunk_index, chunk_content, chunk_type,
            word_count, char_count, meta_info, created_at
        FROM contentchunk
    """)
    
    # 4. 迁移现有的 summary 数据到 ai_results 表
    op.execute("""
        INSERT INTO ai_results (
            id, content_item_id, summary, created_at, updated_at
        )
        SELECT 
            gen_random_uuid(), id, 
            CASE 
                WHEN summary IS NOT NULL THEN jsonb_build_object('text', summary)
                ELSE NULL 
            END,
            created_at, updated_at
        FROM contentitem 
        WHERE summary IS NOT NULL
    """)
    
    # 5. 删除旧表和冗余字段
    op.drop_table('contentchunk')
    op.drop_column('contentitem', 'summary')
    op.drop_column('aiconversation', 'summary')


def downgrade():
    """回滚 Phase 2 更改"""
    
    # 1. 恢复 contentitem 和 aiconversation 的 summary 字段
    op.add_column('contentitem', sa.Column('summary', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('aiconversation', sa.Column('summary', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    
    # 2. 重新创建 contentchunk 表
    op.create_table('contentchunk',
        sa.Column('content_item_id', sa.Uuid(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('chunk_content', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('chunk_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('word_count', sa.Integer(), nullable=False),
        sa.Column('char_count', sa.Integer(), nullable=False),
        sa.Column('meta_info', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.CheckConstraint("chunk_type IN ('heading', 'paragraph', 'code_block', 'table', 'list')"),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 3. 迁移数据回去
    op.execute("""
        INSERT INTO contentchunk (
            id, content_item_id, chunk_index, chunk_content, chunk_type,
            word_count, char_count, meta_info, created_at
        )
        SELECT 
            id, content_item_id, segment_index, content, segment_type,
            word_count, char_count, meta_info, created_at
        FROM segments
    """)
    
    # 4. 恢复 summary 数据
    op.execute("""
        UPDATE contentitem 
        SET summary = ai_results.summary->>'text'
        FROM ai_results 
        WHERE contentitem.id = ai_results.content_item_id
        AND ai_results.summary IS NOT NULL
    """)
    
    # 5. 删除新表
    op.drop_table('segments')
    op.drop_table('ai_results')
