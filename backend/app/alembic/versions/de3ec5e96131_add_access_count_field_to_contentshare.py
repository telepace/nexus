"""add_access_count_field_to_contentshare

Revision ID: de3ec5e96131
Revises: 25e0ac8d39be
Create Date: 2025-06-20 21:43:28.838306

"""
from alembic import op
import sqlalchemy as sa
from alembic import context

# revision identifiers, used by Alembic.
revision = 'de3ec5e96131'
down_revision = '25e0ac8d39be'
branch_labels = None
depends_on = None

def upgrade():
    # Check if access_count column already exists
    connection = context.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('contentshare')]

    if 'access_count' not in columns:
        # Add access_count column to contentshare table
        op.add_column('contentshare', sa.Column('access_count', sa.Integer(), nullable=False, server_default='0'))

def downgrade():
    # Check if access_count column exists before trying to drop it
    connection = context.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('contentshare')]

    if 'access_count' in columns:
        # Remove access_count column from contentshare table
        op.drop_column('contentshare', 'access_count')
