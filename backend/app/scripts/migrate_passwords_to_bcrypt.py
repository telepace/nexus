"""
用户密码迁移脚本 - 从CryptoJS到bcrypt

功能:
1. 批量迁移现有用户密码
2. 保持服务可用性 (在线迁移)
3. 数据完整性检查
4. 回滚支持
5. 进度监控

使用方法:
    python scripts/migrate_passwords_to_bcrypt.py --batch-size 100 --dry-run
    python scripts/migrate_passwords_to_bcrypt.py --batch-size 100 --execute
"""

import argparse
import logging
import sys
import time
from datetime import datetime
from typing import Any

# 添加项目路径
sys.path.insert(0, '/Users/xiongxinwei/data/workspaces/telepace/nexus/backend')

from sqlmodel import Session, select

from app.core.db import engine
from app.core.security import decrypt_password  # 旧解密函数
from app.core.security_modern import ModernSecurityManager
from app.models import User

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'password_migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class PasswordMigrationManager:
    """密码迁移管理器"""

    def __init__(self, batch_size: int = 50, dry_run: bool = True):
        self.batch_size = batch_size
        self.dry_run = dry_run
        self.stats = {
            "total_users": 0,
            "migrated_users": 0,
            "failed_users": 0,
            "skipped_users": 0,
            "start_time": None,
            "end_time": None,
        }

    def get_users_needing_migration(self, session: Session, limit: int) -> list[User]:
        """获取需要迁移的用户"""
        statement = select(User).where(
            User.is_active == True,
            User.password_hash.is_(None),  # 还没有bcrypt密码
            User.hashed_password.is_not(None)  # 有旧密码
        ).limit(limit)

        return session.exec(statement).all()

    def decrypt_old_password(self, encrypted_password: str) -> str | None:
        """解密旧密码"""
        try:
            return decrypt_password(encrypted_password)
        except Exception as e:
            logger.error(f"解密旧密码失败: {e}")
            return None

    def migrate_user_password(self, session: Session, user: User, plain_password: str) -> bool:
        """迁移单个用户密码"""
        try:
            # 生成bcrypt哈希
            bcrypt_hash = ModernSecurityManager.hash_password(plain_password)

            # 验证新哈希是否正确
            if not ModernSecurityManager.verify_password(plain_password, bcrypt_hash):
                logger.error(f"用户 {user.email} 新密码验证失败")
                return False

            if not self.dry_run:
                # 更新用户记录
                user.password_hash = bcrypt_hash
                user.password_migrated = True
                session.add(user)
                session.commit()

                logger.info(f"用户 {user.email} 密码迁移成功")
            else:
                logger.info(f"[DRY RUN] 用户 {user.email} 密码迁移准备就绪")

            return True

        except Exception as e:
            logger.error(f"用户 {user.email} 密码迁移失败: {e}")
            if not self.dry_run:
                session.rollback()
            return False

    def run_migration_batch(self, session: Session) -> dict[str, int]:
        """运行一批迁移"""
        batch_stats = {
            "processed": 0,
            "succeeded": 0,
            "failed": 0,
            "skipped": 0
        }

        users = self.get_users_needing_migration(session, self.batch_size)

        for user in users:
            batch_stats["processed"] += 1

            try:
                # 解密旧密码
                plain_password = self.decrypt_old_password(user.hashed_password)

                if not plain_password:
                    logger.warning(f"用户 {user.email} 旧密码解密失败，跳过")
                    batch_stats["skipped"] += 1
                    continue

                # 迁移密码
                if self.migrate_user_password(session, user, plain_password):
                    batch_stats["succeeded"] += 1
                    self.stats["migrated_users"] += 1
                else:
                    batch_stats["failed"] += 1
                    self.stats["failed_users"] += 1

            except Exception as e:
                logger.error(f"处理用户 {user.email} 时出错: {e}")
                batch_stats["failed"] += 1
                self.stats["failed_users"] += 1

        return batch_stats

    def run_full_migration(self) -> dict[str, Any]:
        """运行完整迁移"""
        logger.info(f"开始密码迁移 - {'DRY RUN' if self.dry_run else 'EXECUTE'} 模式")
        logger.info(f"批次大小: {self.batch_size}")

        self.stats["start_time"] = datetime.now()

        with Session(engine) as session:
            # 获取总用户数
            total_statement = select(User).where(
                User.is_active == True,
                User.password_hash.is_(None),
                User.hashed_password.is_not(None)
            )
            total_users = len(session.exec(total_statement).all())
            self.stats["total_users"] = total_users

            logger.info(f"发现 {total_users} 个用户需要迁移")

            if total_users == 0:
                logger.info("没有用户需要迁移")
                return self.stats

            # 分批处理
            batch_num = 0
            while True:
                batch_num += 1
                logger.info(f"处理第 {batch_num} 批...")

                batch_stats = self.run_migration_batch(session)

                if batch_stats["processed"] == 0:
                    logger.info("所有用户已处理完成")
                    break

                logger.info(
                    f"批次 {batch_num} 完成: "
                    f"处理 {batch_stats['processed']}, "
                    f"成功 {batch_stats['succeeded']}, "
                    f"失败 {batch_stats['failed']}, "
                    f"跳过 {batch_stats['skipped']}"
                )

                # 进度更新
                progress = (self.stats["migrated_users"] + self.stats["failed_users"] + self.stats["skipped_users"]) / total_users * 100
                logger.info(f"总进度: {progress:.1f}%")

                # 短暂休息，避免影响生产环境
                time.sleep(0.1)

        self.stats["end_time"] = datetime.now()
        duration = (self.stats["end_time"] - self.stats["start_time"]).total_seconds()

        logger.info("=" * 50)
        logger.info("密码迁移完成")
        logger.info(f"总用户数: {self.stats['total_users']}")
        logger.info(f"迁移成功: {self.stats['migrated_users']}")
        logger.info(f"迁移失败: {self.stats['failed_users']}")
        logger.info(f"跳过用户: {self.stats['skipped_users']}")
        logger.info(f"总耗时: {duration:.2f} 秒")
        logger.info(f"成功率: {(self.stats['migrated_users'] / max(self.stats['total_users'], 1)) * 100:.1f}%")
        logger.info("=" * 50)

        return self.stats

    def verify_migration(self) -> dict[str, Any]:
        """验证迁移结果"""
        logger.info("验证迁移结果...")

        with Session(engine) as session:
            # 统计迁移情况
            total_users = session.exec(
                select(User).where(User.is_active == True)
            ).all()

            migrated_users = session.exec(
                select(User).where(
                    User.is_active == True,
                    User.password_hash.is_not(None),
                    User.password_migrated == True
                )
            ).all()

            pending_users = session.exec(
                select(User).where(
                    User.is_active == True,
                    User.password_hash.is_(None),
                    User.hashed_password.is_not(None)
                )
            ).all()

            verification_stats = {
                "total_active_users": len(total_users),
                "migrated_users": len(migrated_users),
                "pending_users": len(pending_users),
                "migration_completion": len(migrated_users) / max(len(total_users), 1) * 100
            }

            logger.info("迁移验证结果:")
            logger.info(f"活跃用户总数: {verification_stats['total_active_users']}")
            logger.info(f"已迁移用户: {verification_stats['migrated_users']}")
            logger.info(f"待迁移用户: {verification_stats['pending_users']}")
            logger.info(f"迁移完成率: {verification_stats['migration_completion']:.1f}%")

            return verification_stats

def main():
    parser = argparse.ArgumentParser(description="用户密码迁移工具")
    parser.add_argument("--batch-size", type=int, default=50, help="批处理大小")
    parser.add_argument("--dry-run", action="store_true", help="只模拟运行，不实际修改数据")
    parser.add_argument("--execute", action="store_true", help="执行实际迁移")
    parser.add_argument("--verify-only", action="store_true", help="仅验证迁移结果")

    args = parser.parse_args()

    if not args.execute and not args.dry_run and not args.verify_only:
        logger.error("请指定运行模式: --dry-run 或 --execute 或 --verify-only")
        return

    if args.verify_only:
        manager = PasswordMigrationManager()
        manager.verify_migration()
        return

    # 确认执行模式
    if args.execute:
        response = input("⚠️  确认要执行实际密码迁移吗？这将修改数据库中的用户密码。输入 'YES' 确认: ")
        if response != "YES":
            logger.info("迁移已取消")
            return

    # 运行迁移
    manager = PasswordMigrationManager(
        batch_size=args.batch_size,
        dry_run=args.dry_run
    )

    stats = manager.run_full_migration()

    # 迁移后验证
    if args.execute and stats["migrated_users"] > 0:
        time.sleep(1)  # 等待数据库提交
        manager.verify_migration()

if __name__ == "__main__":
    main()
