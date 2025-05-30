"""add_content_tables

Revision ID: 3d595f99f9dc
Revises: 568a9c9e88d4
Create Date: 2025-05-25 23:33:37.278991

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3d595f99f9dc'
down_revision = '568a9c9e88d4'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('contentitem',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('source_uri', sqlmodel.sql.sqltypes.AutoString(length=2048), nullable=True),
    sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('summary', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('content_text', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('content_vector', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('meta_info', sa.JSON(), nullable=True),
    sa.Column('processing_status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('error_message', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contentitem_id'), 'contentitem', ['id'], unique=False)
    op.create_index(op.f('ix_contentitem_processing_status'), 'contentitem', ['processing_status'], unique=False)
    op.create_index(op.f('ix_contentitem_type'), 'contentitem', ['type'], unique=False)
    op.create_index(op.f('ix_contentitem_user_id'), 'contentitem', ['user_id'], unique=False)
    op.create_table('aiconversation',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('content_item_id', sa.Uuid(), nullable=True),
    sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('ai_model_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
    sa.Column('messages', sa.JSON(), server_default='[]', nullable=False),
    sa.Column('summary', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('meta_info', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['content_item_id'], ['contentitem.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_aiconversation_content_item_id'), 'aiconversation', ['content_item_id'], unique=False)
    op.create_index(op.f('ix_aiconversation_id'), 'aiconversation', ['id'], unique=False)
    op.create_index(op.f('ix_aiconversation_user_id'), 'aiconversation', ['user_id'], unique=False)
    op.create_table('contentasset',
    sa.Column('content_item_id', sa.Uuid(), nullable=False),
    sa.Column('type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('file_path', sqlmodel.sql.sqltypes.AutoString(length=1024), nullable=True),
    sa.Column('s3_bucket', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
    sa.Column('s3_key', sqlmodel.sql.sqltypes.AutoString(length=1024), nullable=True),
    sa.Column('local_path', sqlmodel.sql.sqltypes.AutoString(length=1024), nullable=True),
    sa.Column('mime_type', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
    sa.Column('size_bytes', sa.Integer(), nullable=True),
    sa.Column('meta_info', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['content_item_id'], ['contentitem.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contentasset_content_item_id'), 'contentasset', ['content_item_id'], unique=False)
    op.create_index(op.f('ix_contentasset_id'), 'contentasset', ['id'], unique=False)
    op.create_index(op.f('ix_contentasset_type'), 'contentasset', ['type'], unique=False)
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
    sa.ForeignKeyConstraint(['content_item_id'], ['contentitem.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_processingjob_content_item_id'), 'processingjob', ['content_item_id'], unique=False)
    op.create_index(op.f('ix_processingjob_id'), 'processingjob', ['id'], unique=False)
    op.create_index(op.f('ix_processingjob_processor_name'), 'processingjob', ['processor_name'], unique=False)
    op.create_index(op.f('ix_processingjob_status'), 'processingjob', ['status'], unique=False)
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_processingjob_status'), table_name='processingjob')
    op.drop_index(op.f('ix_processingjob_processor_name'), table_name='processingjob')
    op.drop_index(op.f('ix_processingjob_id'), table_name='processingjob')
    op.drop_index(op.f('ix_processingjob_content_item_id'), table_name='processingjob')
    op.drop_table('processingjob')
    op.drop_index(op.f('ix_contentasset_type'), table_name='contentasset')
    op.drop_index(op.f('ix_contentasset_id'), table_name='contentasset')
    op.drop_index(op.f('ix_contentasset_content_item_id'), table_name='contentasset')
    op.drop_table('contentasset')
    op.drop_index(op.f('ix_aiconversation_user_id'), table_name='aiconversation')
    op.drop_index(op.f('ix_aiconversation_id'), table_name='aiconversation')
    op.drop_index(op.f('ix_aiconversation_content_item_id'), table_name='aiconversation')
    op.drop_table('aiconversation')
    op.drop_index(op.f('ix_contentitem_user_id'), table_name='contentitem')
    op.drop_index(op.f('ix_contentitem_type'), table_name='contentitem')
    op.drop_index(op.f('ix_contentitem_processing_status'), table_name='contentitem')
    op.drop_index(op.f('ix_contentitem_id'), table_name='contentitem')
    op.drop_table('contentitem')
    # ### end Alembic commands ###
