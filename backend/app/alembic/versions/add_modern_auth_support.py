"""add_modern_auth_support

添加现代认证支持 - bcrypt密码哈希字段

Revision ID: modern_auth_001
Revises: optimize_auth_001
Create Date: 2025-01-03 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision = 'modern_auth_001'
down_revision = 'optimize_auth_001'
branch_labels = None
depends_on = None

def upgrade():
    """添加现代认证支持"""
    
    # 1. 添加新的密码哈希字段
    op.add_column('user', sa.Column('password_hash', sa.String(255), nullable=True))
    
    # 2. 添加字段注释
    op.execute(text("""
        COMMENT ON COLUMN "user".password_hash IS 'bcrypt哈希密码 - 现代认证系统使用'
    """))
    
    # 3. 创建密码迁移状态字段
    op.add_column('user', sa.Column('password_migrated', sa.Boolean(), nullable=True))
    
    # 为现有记录设置默认值
    op.execute("UPDATE \"user\" SET password_migrated = false WHERE password_migrated IS NULL")
    
    # 然后将字段设为非空
    op.alter_column('user', 'password_migrated', nullable=False, server_default=sa.text('false'))
    
    # 4. 添加迁移标记索引
    op.create_index(
        'ix_users_password_migrated', 
        'user', 
        ['password_migrated']
    )
    
    # 5. 创建用户迁移统计视图
    op.execute(text("""
        CREATE VIEW user_migration_stats AS
        SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN password_migrated = true THEN 1 END) as migrated_users,
            COUNT(CASE WHEN password_migrated = false THEN 1 END) as pending_users,
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    ROUND((COUNT(CASE WHEN password_migrated = true THEN 1 END) * 100.0) / COUNT(*), 2)
                ELSE 0 
            END as migration_percentage
        FROM "user"
        WHERE is_active = true
    """))
    
    # 6. 创建安全统计视图
    op.execute(text("""
        CREATE VIEW auth_security_stats AS
        SELECT 
            'bcrypt' as password_hash_type,
            COUNT(CASE WHEN password_hash IS NOT NULL THEN 1 END) as users_with_modern_auth,
            COUNT(CASE WHEN password_hash IS NULL AND hashed_password IS NOT NULL THEN 1 END) as users_with_legacy_auth,
            AVG(CASE WHEN password_migrated = true THEN 1.0 ELSE 0.0 END) * 100 as security_score
        FROM "user"
        WHERE is_active = true
    """))

def downgrade():
    """移除现代认证支持"""
    
    # 删除视图
    op.execute(text("DROP VIEW IF EXISTS auth_security_stats"))
    op.execute(text("DROP VIEW IF EXISTS user_migration_stats"))
    
    # 删除索引
    op.drop_index('ix_users_password_migrated', table_name='user')
    
    # 删除列
    op.drop_column('user', 'password_migrated')
    op.drop_column('user', 'password_hash')