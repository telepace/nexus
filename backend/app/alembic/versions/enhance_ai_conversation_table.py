"""enhance_ai_conversation_table

Revision ID: enhance_ai_conversation_001
Revises: remove_processing_job_001
Create Date: 2025-01-27 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'enhance_ai_conversation_001'
down_revision = 'remove_processing_job_001'
branch_labels = None
depends_on = None

def upgrade():
    """增强AIConversation表并迁移AIResult数据"""

    # 阶段1: 为AIConversation表添加新字段
    op.add_column('aiconversation', sa.Column('conversation_type', sa.String(length=50), nullable=False, server_default='user_chat'))
    op.add_column('aiconversation', sa.Column('summary', sa.String(length=500), nullable=True))
    op.add_column('aiconversation', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))

    # 添加约束
    op.create_check_constraint(
        'ck_aiconversation_conversation_type',
        'aiconversation',
        "conversation_type IN ('auto_analysis', 'user_chat', 'prompt_analysis')"
    )

    # 添加索引
    op.create_index('ix_aiconversation_conversation_type', 'aiconversation', ['conversation_type'])
    op.create_index('ix_aiconversation_is_active', 'aiconversation', ['is_active'])

    # 阶段2: 迁移AIResult数据到AIConversation
    # 将现有AI结果迁移为对话格式
    op.execute(text("""
        INSERT INTO aiconversation (
            id, user_id, content_item_id, title, conversation_type,
            ai_model_name, messages, summary, is_active, created_at, updated_at
        )
        SELECT
            gen_random_uuid() as id,
            ci.user_id,
            ar.content_item_id,
            CONCAT('自动分析: ', COALESCE(ci.title, '内容分析')) as title,
            'auto_analysis' as conversation_type,
            'gpt-4' as ai_model_name,
            jsonb_build_array(
                jsonb_build_object(
                    'role', 'system',
                    'content', '你是一个专业的内容分析师，擅长提取和总结文章的核心信息。',
                    'timestamp', ar.created_at::text,
                    'metadata', jsonb_build_object('auto_generated', true)
                ),
                jsonb_build_object(
                    'role', 'user',
                    'content', '请分析这篇内容并提供摘要和关键要点。',
                    'timestamp', ar.created_at::text,
                    'metadata', jsonb_build_object('auto_generated', true)
                ),
                jsonb_build_object(
                    'role', 'assistant',
                    'content', CASE
                        WHEN ar.summary IS NOT NULL AND ar.key_points IS NOT NULL THEN
                            CONCAT('## 内容摘要\n',
                                   COALESCE(ar.summary->>'summary', ar.summary::text),
                                   '\n\n## 关键要点\n',
                                   CASE
                                       WHEN jsonb_typeof(ar.key_points) = 'array' THEN
                                           array_to_string(
                                               ARRAY(SELECT '- ' || value::text FROM jsonb_array_elements_text(ar.key_points)),
                                               '\n'
                                           )
                                       ELSE ar.key_points::text
                                   END,
                                   COALESCE('\n\n## 内容分析\n' || ar.content_analysis::text, ''),
                                   COALESCE('\n\n阅读时间: ' || ar.reading_time_minutes::text || ' 分钟', ''),
                                   COALESCE('\n难度级别: ' || ar.difficulty_level, ''),
                                   COALESCE('\n质量评分: ' || ar.content_quality_score::text, ''))
                        ELSE '分析结果已生成，请查看相关数据。'
                    END,
                    'timestamp', ar.updated_at::text,
                    'metadata', jsonb_build_object('auto_generated', true, 'migrated_from_ai_result', true)
                )
            ) as messages,
            CASE
                WHEN ar.summary IS NOT NULL THEN
                    SUBSTRING(COALESCE(ar.summary->>'summary', ar.summary::text), 1, 200)
                ELSE '内容分析完成'
            END as summary,
            true as is_active,
            ar.created_at,
            ar.updated_at
        FROM ai_results ar
        JOIN contentitem ci ON ar.content_item_id = ci.id
        WHERE NOT EXISTS (
            SELECT 1 FROM aiconversation ac
            WHERE ac.content_item_id = ar.content_item_id
            AND ac.conversation_type = 'auto_analysis'
        );
    """))

def downgrade():
    """回滚AIConversation表的增强"""

    # 删除新添加的索引
    op.drop_index('ix_aiconversation_is_active', table_name='aiconversation')
    op.drop_index('ix_aiconversation_conversation_type', table_name='aiconversation')

    # 删除约束
    op.drop_constraint('ck_aiconversation_conversation_type', 'aiconversation', type_='check')

    # 删除新添加的字段
    op.drop_column('aiconversation', 'is_active')
    op.drop_column('aiconversation', 'summary')
    op.drop_column('aiconversation', 'conversation_type')

    # 注意：这里不删除迁移的对话数据，以防数据丢失
    # 如果需要完全回滚，可以添加删除迁移数据的SQL