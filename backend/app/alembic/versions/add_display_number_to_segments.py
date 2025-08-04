"""Add display_number to segments table

Revision ID: add_display_number_001
Revises: 713b69d73b30
Create Date: 2025-07-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_display_number_001'
down_revision = '713b69d73b30'  # Updated to the latest revision
branch_labels = None
depends_on = None

def upgrade() -> None:
    """Add display_number column to segments table."""
    # Add the new column
    op.add_column('segments', sa.Column('display_number', sa.Integer(), nullable=True))

    # Create index for the new column
    op.create_index(op.f('ix_segments_display_number'), 'segments', ['display_number'], unique=False)

    # Update existing records to set display_number = segment_index + 1
    # This handles existing data migration
    op.execute("""
        UPDATE segments
        SET display_number = segment_index + 1
        WHERE display_number IS NULL
    """)

    # Make the column non-nullable after populating existing records
    op.alter_column('segments', 'display_number', nullable=False)

def downgrade() -> None:
    """Remove display_number column from segments table."""
    op.drop_index(op.f('ix_segments_display_number'), table_name='segments')
    op.drop_column('segments', 'display_number')