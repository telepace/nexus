"""merge_migration_heads

Revision ID: 61f9810aa1b0
Revises: 6055f61527a6, enhance_ai_conversation_001
Create Date: 2025-06-24 11:23:59.699921

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '61f9810aa1b0'
down_revision = ('6055f61527a6', 'enhance_ai_conversation_001')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
