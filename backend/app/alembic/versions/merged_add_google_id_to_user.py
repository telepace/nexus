"""merged_add_google_id_to_user

Revision ID: 1e3b5c7f9d2a
Revises: 097e0e7430a6
Create Date: 2024-10-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e3b5c7f9d2a'
down_revision: Union[str, None] = '097e0e7430a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add google_id column to user table
    op.add_column('user', sa.Column('google_id', sa.String(255), nullable=True))
    op.create_index(op.f('ix_user_google_id'), 'user', ['google_id'], unique=True)
    
    # Make hashed_password nullable for OAuth users
    op.alter_column('user', 'hashed_password', existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    # Drop google_id column and make hashed_password required again
    op.drop_index(op.f('ix_user_google_id'), table_name='user')
    op.drop_column('user', 'google_id')
    op.alter_column('user', 'hashed_password', existing_type=sa.String(255), nullable=False) 