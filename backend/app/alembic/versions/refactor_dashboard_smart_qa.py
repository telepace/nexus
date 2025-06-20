"""refactor_dashboard_smart_qa

Revision ID: refactor_dashboard_smart_qa
Revises: d833ea6f9420
Create Date: 2025-01-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'refactor_dashboard_smart_qa'
down_revision = 'd833ea6f9420'
branch_labels = None
depends_on = None


def upgrade():
    """执行数据库重构升级操作"""
    
    # 1. 将现有 item 表重命名为 projects 并扩展字段
    print("重构 item 表为 projects 表...")
    
    # 重命名表
    op.rename_table('item', 'projects')
    
    # 添加新字段到 projects 表
    op.add_column('projects', sa.Column('ai_context', postgresql.JSONB(), nullable=True, server_default='{}'))
    op.add_column('projects', sa.Column('project_type', sa.String(50), nullable=True, server_default='general'))
    op.add_column('projects', sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'))
    op.add_column('projects', sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')))
    op.add_column('projects', sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')))
    
    # 创建索引
    op.create_index('ix_projects_project_type', 'projects', ['project_type'])
    op.create_index('ix_projects_is_active', 'projects', ['is_active'])
    op.create_index('ix_projects_created_at', 'projects', ['created_at'])
    
    # 2. 创建 project_tags 关联表
    print("创建 project_tags 关联表...")
    op.create_table(
        'project_tags',
        sa.Column('id', postgresql.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('project_id', postgresql.UUID(), nullable=False),
        sa.Column('tag_id', postgresql.UUID(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=True, server_default='1.0'),
        sa.Column('created_by_ai', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'tag_id', name='uq_project_tag')
    )
    
    # 创建索引
    op.create_index('ix_project_tags_project_id', 'project_tags', ['project_id'])
    op.create_index('ix_project_tags_tag_id', 'project_tags', ['tag_id'])
    op.create_index('ix_project_tags_created_by_ai', 'project_tags', ['created_by_ai'])
    
    # 3. 创建 contentitem_tags 关联表
    print("创建 contentitem_tags 关联表...")
    op.create_table(
        'contentitem_tags',
        sa.Column('id', postgresql.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('content_item_id', postgresql.UUID(), nullable=False),
        sa.Column('tag_id', postgresql.UUID(), nullable=False),
        sa.Column('relevance_score', sa.Float(), nullable=True, server_default='1.0'),
        sa.Column('created_by_ai', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('content_item_id', 'tag_id', name='uq_contentitem_tag')
    )
    
    # 创建索引
    op.create_index('ix_contentitem_tags_content_item_id', 'contentitem_tags', ['content_item_id'])
    op.create_index('ix_contentitem_tags_tag_id', 'contentitem_tags', ['tag_id'])
    op.create_index('ix_contentitem_tags_created_by_ai', 'contentitem_tags', ['created_by_ai'])
    
    # 4. 创建 query_routes 表
    print("创建 query_routes 表...")
    op.create_table(
        'query_routes',
        sa.Column('id', postgresql.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(), nullable=False),
        sa.Column('query_text', sa.Text(), nullable=False),
        sa.Column('routed_project_id', postgresql.UUID(), nullable=True),
        sa.Column('routed_tag_id', postgresql.UUID(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('routing_context', postgresql.JSONB(), nullable=True, server_default='{}'),
        sa.Column('user_confirmed', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 创建索引
    op.create_index('ix_query_routes_user_id', 'query_routes', ['user_id'])
    op.create_index('ix_query_routes_routed_project_id', 'query_routes', ['routed_project_id'])
    op.create_index('ix_query_routes_routed_tag_id', 'query_routes', ['routed_tag_id'])
    op.create_index('ix_query_routes_created_at', 'query_routes', ['created_at'])
    op.create_index('ix_query_routes_user_confirmed', 'query_routes', ['user_confirmed'])
    
    # 5. 扩展现有 contentitem 表
    print("扩展 contentitem 表...")
    op.add_column('contentitem', sa.Column('project_id', postgresql.UUID(), nullable=True))
    op.create_index('ix_contentitem_project_id', 'contentitem', ['project_id'])
    
    print("数据库重构完成！")


def downgrade():
    """执行数据库重构降级操作"""
    
    # 删除新增的索引和列
    print("开始回滚数据库重构...")
    
    # 删除 contentitem 表的扩展
    op.drop_index('ix_contentitem_project_id', 'contentitem')
    op.drop_column('contentitem', 'project_id')
    
    # 删除 query_routes 表
    op.drop_index('ix_query_routes_user_confirmed', 'query_routes')
    op.drop_index('ix_query_routes_created_at', 'query_routes')
    op.drop_index('ix_query_routes_routed_tag_id', 'query_routes')
    op.drop_index('ix_query_routes_routed_project_id', 'query_routes')
    op.drop_index('ix_query_routes_user_id', 'query_routes')
    op.drop_table('query_routes')
    
    # 删除 contentitem_tags 表
    op.drop_index('ix_contentitem_tags_created_by_ai', 'contentitem_tags')
    op.drop_index('ix_contentitem_tags_tag_id', 'contentitem_tags')
    op.drop_index('ix_contentitem_tags_content_item_id', 'contentitem_tags')
    op.drop_table('contentitem_tags')
    
    # 删除 project_tags 表
    op.drop_index('ix_project_tags_created_by_ai', 'project_tags')
    op.drop_index('ix_project_tags_tag_id', 'project_tags')
    op.drop_index('ix_project_tags_project_id', 'project_tags')
    op.drop_table('project_tags')
    
    # 恢复 projects 表为 item 表
    op.drop_index('ix_projects_created_at', 'projects')
    op.drop_index('ix_projects_is_active', 'projects')
    op.drop_index('ix_projects_project_type', 'projects')
    
    op.drop_column('projects', 'updated_at')
    op.drop_column('projects', 'created_at')
    op.drop_column('projects', 'is_active')
    op.drop_column('projects', 'project_type')
    op.drop_column('projects', 'ai_context')
    
    # 重命名表回原名
    op.rename_table('projects', 'item')
    
    print("数据库重构回滚完成！") 