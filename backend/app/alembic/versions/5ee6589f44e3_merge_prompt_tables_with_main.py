"""merge_prompt_tables_with_main

Revision ID: 5ee6589f44e3
Revises: 0001, 1e3b5c7f9d2a
Create Date: 2025-05-21 14:22:38.785318

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '5ee6589f44e3'
down_revision = ('0001', '1e3b5c7f9d2a')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
