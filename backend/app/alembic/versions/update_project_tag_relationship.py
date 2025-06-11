"""update_project_tag_relationship

Revision ID: update_project_tag_relationship
Revises: refactor_dashboard_smart_qa
Create Date: 2025-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'update_project_tag_relationship'
down_revision = 'refactor_dashboard_smart_qa'
branch_labels = None
depends_on = None


def upgrade():
    """将项目和标签的关系从多对多改为一对多"""
    
    print("更新项目标签关系：从多对多改为一对多...")
    
    # 1. 添加 tag_id 字段到 projects 表
    print("添加 tag_id 字段到 projects 表...")
    op.add_column('projects', sa.Column('tag_id', postgresql.UUID(), nullable=True))
    op.create_index('ix_projects_tag_id', 'projects', ['tag_id'])
    
    # 2. 迁移现有的 project_tags 数据到 projects.tag_id
    # 为每个项目选择第一个关联的标签（如果有多个的话）
    print("迁移现有的项目标签关系...")
    op.execute("""
        UPDATE projects 
        SET tag_id = (
            SELECT tag_id 
            FROM project_tags 
            WHERE project_tags.project_id = projects.id 
            ORDER BY project_tags.created_at ASC 
            LIMIT 1
        )
    """)
    
    # 3. 删除 project_tags 表
    print("删除 project_tags 关联表...")
    op.drop_index('ix_project_tags_created_by_ai', 'project_tags')
    op.drop_index('ix_project_tags_tag_id', 'project_tags')
    op.drop_index('ix_project_tags_project_id', 'project_tags')
    op.drop_table('project_tags')
    
    print("项目标签关系更新完成！")


def downgrade():
    """回滚：将一对多关系改回多对多"""
    
    print("回滚项目标签关系：从一对多改回多对多...")
    
    # 1. 重新创建 project_tags 表
    print("重新创建 project_tags 关联表...")
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
    
    # 2. 迁移现有的 projects.tag_id 数据到 project_tags
    print("迁移项目标签关系回到关联表...")
    op.execute("""
        INSERT INTO project_tags (project_id, tag_id, confidence_score, created_by_ai, created_at)
        SELECT id, tag_id, 1.0, false, CURRENT_TIMESTAMP
        FROM projects 
        WHERE tag_id IS NOT NULL
    """)
    
    # 3. 删除 projects 表的 tag_id 字段
    print("删除 projects 表的 tag_id 字段...")
    op.drop_index('ix_projects_tag_id', 'projects')
    op.drop_column('projects', 'tag_id')
    
    print("项目标签关系回滚完成！") 