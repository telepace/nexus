"""optimize_auth_indexes

创建认证优化索引

Revision ID: optimize_auth_001
Revises: phase3_001
Create Date: 2025-01-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'optimize_auth_001'
down_revision = 'phase3_001'
branch_labels = None
depends_on = None

def upgrade():
    """添加认证性能优化索引"""
    
    # 1. 用户表认证相关索引 - 核心优化
    # 邮箱+激活状态复合索引，用于登录验证
    op.create_index(
        'ix_users_email_is_active',
        'user',
        ['email', 'is_active'],
        postgresql_where=sa.text('is_active = true')
    )
    
    # Google ID 索引，用于Google OAuth登录 (如果列存在)
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='google_id') THEN
                CREATE INDEX IF NOT EXISTS ix_users_google_id 
                ON "user"(google_id) 
                WHERE google_id IS NOT NULL;
            END IF;
        END
        $$;
    """)
    
    # 2. Token黑名单优化索引 - 解决主要性能瓶颈
    # Token+过期时间复合索引，避免扫描过期token
    op.create_index(
        'ix_tokenblacklist_token_expires_at',
        'tokenblacklist',
        ['token', 'expires_at']
    )
    
    # 用户ID+过期时间索引，用于清理用户相关的过期token
    op.create_index(
        'ix_tokenblacklist_user_expires_at',
        'tokenblacklist',
        ['user_id', 'expires_at']
    )
    
    # 3. 过期token清理视图 - 避免全表扫描
    op.execute("""
        CREATE OR REPLACE VIEW active_token_blacklist AS
        SELECT id, token, user_id, expires_at, created_at
        FROM tokenblacklist 
        WHERE expires_at > NOW()
    """)
    
    # 4. 自动清理过期token的存储过程
    op.execute("""
        CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
        RETURNS INTEGER AS $$
        DECLARE
            deleted_count INTEGER;
        BEGIN
            DELETE FROM tokenblacklist WHERE expires_at <= NOW();
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
    """)

def downgrade():
    """移除认证优化索引"""
    
    # 删除索引
    op.drop_index('ix_users_email_is_active', table_name='user', if_exists=True)
    op.execute("DROP INDEX IF EXISTS ix_users_google_id")
    op.drop_index('ix_tokenblacklist_token_expires_at', table_name='tokenblacklist', if_exists=True)
    op.drop_index('ix_tokenblacklist_user_expires_at', table_name='tokenblacklist', if_exists=True)
    
    # 删除视图和函数
    op.execute("DROP VIEW IF EXISTS active_token_blacklist")
    op.execute("DROP FUNCTION IF EXISTS cleanup_expired_tokens()")