"""添加提示词管理相关表

Revision ID: 0001
Revises: 
Create Date: 2023-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # 创建tags表
    op.create_table(
        'tags',
        sa.Column('id', postgresql.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tags_name'), 'tags', ['name'], unique=True)

    # 创建prompts表
    op.create_table(
        'prompts',
        sa.Column('id', postgresql.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('input_vars', sa.JSON(), nullable=True),
        sa.Column('visibility', sa.String(), nullable=False),
        sa.Column('team_id', postgresql.UUID(), nullable=True),
        sa.Column('meta_data', sa.JSON(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_by', postgresql.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP'), server_onupdate=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('embedding', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 为了便于查询，添加索引
    op.create_index(op.f('ix_prompts_created_by'), 'prompts', ['created_by'], unique=False)
    op.create_index(op.f('ix_prompts_type'), 'prompts', ['type'], unique=False)
    op.create_index(op.f('ix_prompts_visibility'), 'prompts', ['visibility'], unique=False)

    # 创建prompt_versions表
    op.create_table(
        'prompt_versions',
        sa.Column('id', postgresql.UUID(), nullable=False),
        sa.Column('prompt_id', postgresql.UUID(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('input_vars', sa.JSON(), nullable=True),
        sa.Column('created_by', postgresql.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('change_notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['prompt_id'], ['prompts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 为版本表添加索引
    op.create_index(op.f('ix_prompt_versions_prompt_id'), 'prompt_versions', ['prompt_id'], unique=False)
    op.create_index(op.f('ix_prompt_versions_version'), 'prompt_versions', ['version'], unique=False)

    # 创建prompt_tags关联表
    op.create_table(
        'prompt_tags',
        sa.Column('prompt_id', postgresql.UUID(), nullable=False),
        sa.Column('tag_id', postgresql.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['prompt_id'], ['prompts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('prompt_id', 'tag_id')
    )


def downgrade():
    # 按照创建的相反顺序删除表
    op.drop_table('prompt_tags')
    op.drop_index(op.f('ix_prompt_versions_version'), table_name='prompt_versions')
    op.drop_index(op.f('ix_prompt_versions_prompt_id'), table_name='prompt_versions')
    op.drop_table('prompt_versions')
    op.drop_index(op.f('ix_prompts_visibility'), table_name='prompts')
    op.drop_index(op.f('ix_prompts_type'), table_name='prompts')
    op.drop_index(op.f('ix_prompts_created_by'), table_name='prompts')
    op.drop_table('prompts')
    op.drop_index(op.f('ix_tags_name'), table_name='tags')
    op.drop_table('tags') 