"""phase1_restore_foreign_key_constraints

Revision ID: phase1_001
Revises: 44f949096831
Create Date: 2025-06-20 18:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'phase1_001'
down_revision = '44f949096831'
branch_labels = None
depends_on = None


def upgrade():
    """Phase 1: 恢复外键约束，确保数据完整性"""
    
    # 0. 先清理脏数据 - 删除引用不存在用户的内容项
    op.execute("""
        DELETE FROM contentitem 
        WHERE user_id NOT IN (SELECT id FROM "user")
    """)
    
    # 清理引用不存在内容项的相关数据
    op.execute("""
        DELETE FROM contentasset 
        WHERE content_item_id NOT IN (SELECT id FROM contentitem)
    """)
    
    op.execute("""
        DELETE FROM processingjob 
        WHERE content_item_id NOT IN (SELECT id FROM contentitem)
    """)
    
    op.execute("""
        DELETE FROM aiconversation 
        WHERE content_item_id IS NOT NULL 
        AND content_item_id NOT IN (SELECT id FROM contentitem)
    """)
    
    # 清理 contentchunk 表（如果存在）
    op.execute("""
        DELETE FROM contentchunk 
        WHERE content_item_id NOT IN (SELECT id FROM contentitem)
    """)
    
    # 1. 恢复 ContentItem 的外键约束
    op.create_foreign_key(
        'fk_contentitem_user_id',
        'contentitem', 'user',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # 2. 恢复 ContentAsset 的外键约束
    op.create_foreign_key(
        'fk_contentasset_content_item_id',
        'contentasset', 'contentitem',
        ['content_item_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # 3. 恢复 ProcessingJob 的外键约束
    op.create_foreign_key(
        'fk_processingjob_content_item_id',
        'processingjob', 'contentitem',
        ['content_item_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # 4. 恢复 AIConversation 的外键约束
    op.create_foreign_key(
        'fk_aiconversation_user_id',
        'aiconversation', 'user',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_aiconversation_content_item_id',
        'aiconversation', 'contentitem',
        ['content_item_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # 5. 添加 ContentChunk 的外键约束（之前缺失）
    try:
        op.create_foreign_key(
            'fk_contentchunk_content_item_id',
            'contentchunk', 'contentitem',
            ['content_item_id'], ['id'],
            ondelete='CASCADE'
        )
    except Exception:
        # contentchunk 表可能不存在，忽略错误
        pass


def downgrade():
    """回滚外键约束"""
    
    # 删除所有外键约束
    constraint_names = [
        ('contentitem', 'fk_contentitem_user_id'),
        ('contentasset', 'fk_contentasset_content_item_id'),
        ('processingjob', 'fk_processingjob_content_item_id'),
        ('aiconversation', 'fk_aiconversation_user_id'),
        ('aiconversation', 'fk_aiconversation_content_item_id'),
        ('contentchunk', 'fk_contentchunk_content_item_id'),
    ]
    
    for table_name, constraint_name in constraint_names:
        try:
            op.drop_constraint(constraint_name, table_name, type_='foreignkey')
        except Exception:
            # 约束可能不存在，忽略错误
            pass
