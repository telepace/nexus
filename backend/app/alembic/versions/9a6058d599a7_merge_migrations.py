"""merge_migrations

Revision ID: 9a6058d599a7
Revises: a89cf8a88bcc, add_images_table
Create Date: 2025-05-30 23:36:39.016067

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '9a6058d599a7'
down_revision = ('a89cf8a88bcc', 'add_images_table')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
