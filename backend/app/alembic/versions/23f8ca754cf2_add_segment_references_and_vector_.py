"""add_segment_references_and_vector_support

Revision ID: 23f8ca754cf2
Revises: de3ec5e96131
Create Date: 2025-06-21 11:18:39.475268

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '23f8ca754cf2'
down_revision = 'de3ec5e96131'
branch_labels = None
depends_on = None


def upgrade():
    # Add content_vector column to segments table
    op.add_column('segments', sa.Column('content_vector', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    
    # Create message_segment_references table
    op.create_table('message_segment_references',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('message_index', sa.Integer(), nullable=False),
        sa.Column('segment_id', sa.UUID(), nullable=False),
        sa.Column('sentence_index', sa.Integer(), nullable=True),
        sa.Column('relevance_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['aiconversation.id'], ),
        sa.ForeignKeyConstraint(['segment_id'], ['segments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better performance
    op.create_index('ix_message_segment_references_conversation_id', 'message_segment_references', ['conversation_id'])
    op.create_index('ix_message_segment_references_segment_id', 'message_segment_references', ['segment_id'])
    op.create_index('ix_message_segment_references_message_index', 'message_segment_references', ['message_index'])
    op.create_index('ix_message_segment_references_id', 'message_segment_references', ['id'])
    
    # Create composite index for efficient lookups
    op.create_index('ix_message_segment_references_conversation_message', 'message_segment_references', ['conversation_id', 'message_index'])


def downgrade():
    # Drop indexes first
    op.drop_index('ix_message_segment_references_conversation_message', table_name='message_segment_references')
    op.drop_index('ix_message_segment_references_id', table_name='message_segment_references')
    op.drop_index('ix_message_segment_references_message_index', table_name='message_segment_references')
    op.drop_index('ix_message_segment_references_segment_id', table_name='message_segment_references')
    op.drop_index('ix_message_segment_references_conversation_id', table_name='message_segment_references')
    
    # Drop table
    op.drop_table('message_segment_references')
    
    # Remove content_vector column from segments table
    op.drop_column('segments', 'content_vector')
