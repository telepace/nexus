"""merge_auth_optimization_heads

Revision ID: ec9e966db750
Revises: 2654e53ee6cc, modern_auth_001
Create Date: 2025-09-03 12:43:33.641895

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'ec9e966db750'
down_revision = ('2654e53ee6cc', 'modern_auth_001')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
