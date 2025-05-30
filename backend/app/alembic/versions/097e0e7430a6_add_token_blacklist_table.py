"""add_token_blacklist_table

Revision ID: 097e0e7430a6
Revises: 1a31ce608336
Create Date: 2025-05-14 17:33:25.521070

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '097e0e7430a6'
down_revision = '1a31ce608336'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('tokenblacklist',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('token', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tokenblacklist_token'), 'tokenblacklist', ['token'], unique=False)
    op.create_index(op.f('ix_tokenblacklist_user_id'), 'tokenblacklist', ['user_id'], unique=False)
    op.create_index(op.f('ix_item_owner_id'), 'item', ['owner_id'], unique=False)
    op.drop_constraint('item_owner_id_fkey', 'item', type_='foreignkey')
    op.alter_column('user', 'email',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('user', 'email',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.create_foreign_key('item_owner_id_fkey', 'item', 'user', ['owner_id'], ['id'], ondelete='CASCADE')
    op.drop_index(op.f('ix_item_owner_id'), table_name='item')
    op.drop_index(op.f('ix_tokenblacklist_user_id'), table_name='tokenblacklist')
    op.drop_index(op.f('ix_tokenblacklist_token'), table_name='tokenblacklist')
    op.drop_table('tokenblacklist')
    # ### end Alembic commands ###
