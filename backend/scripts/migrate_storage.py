#!/usr/bin/env python
"""迁移脚本：将本地存储的文件迁移到云存储

此脚本用于将存储在本地文件系统中的文件（如头像）迁移到云存储（如S3或R2）。
使用方法:
    python -m scripts.migrate_storage [--dry-run]

参数:
    --dry-run: 模拟运行，不实际上传文件
"""

import argparse
import logging
import os
import sys

# 确保可以导入app模块
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.utils.storage import StorageBackend, get_storage_service
from app.utils.storage.local import LocalStorageService

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("storage_migration")


def migrate_files(source_dir, dry_run=False):
    """迁移文件从本地存储到云存储

    Args:
        source_dir: 源文件目录
        dry_run: 如果为True，则不实际上传文件
    """
    # 获取目标存储服务
    storage = get_storage_service()

    # 如果目标也是本地存储，则无需迁移
    if isinstance(storage, LocalStorageService) and storage.base_dir == source_dir:
        logger.warning(
            "Target storage is also local storage with the same directory. No migration needed."
        )
        return

    # 获取源目录中的所有文件
    local_files = []
    for root, _, files in os.walk(source_dir):
        for file in files:
            if file.startswith("."):  # 跳过隐藏文件
                continue
            full_path = os.path.join(root, file)
            # 计算相对路径
            rel_path = os.path.relpath(full_path, source_dir)
            local_files.append((full_path, rel_path))

    logger.info(f"Found {len(local_files)} files to migrate")

    # 如果是空目录，直接返回
    if not local_files:
        logger.info("No files to migrate")
        return

    # 遍历并迁移文件
    success_count = 0
    error_count = 0

    for full_path, rel_path in local_files:
        try:
            # 规范化路径分隔符为正斜杠
            rel_path = rel_path.replace("\\", "/")

            logger.info(f"Migrating: {rel_path}")

            if dry_run:
                logger.info(f"DRY RUN: Would upload {full_path} to {rel_path}")
                success_count += 1
                continue

            # 读取文件
            with open(full_path, "rb") as f:
                file_data = f.read()

            # 上传到目标存储
            url = storage.upload_file(file_data, rel_path)
            logger.info(f"Uploaded: {rel_path} -> {url}")
            success_count += 1

        except Exception as e:
            logger.error(f"Error migrating {rel_path}: {e}")
            error_count += 1

    # 输出结果统计
    logger.info(f"Migration complete: {success_count} succeeded, {error_count} failed")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="Migrate files from local storage to cloud storage"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate the migration without uploading files",
    )
    args = parser.parse_args()

    # 检查存储后端配置
    backend = getattr(settings, "STORAGE_BACKEND", "local")
    if backend == StorageBackend.LOCAL and not args.dry_run:
        logger.warning(
            "Target storage is set to local. Use S3 or R2 backend for cloud migration."
        )
        if input("Continue anyway? (y/n): ").lower() != "y":
            return

    # 设置源目录（当前本地存储目录）
    source_dir = settings.STATIC_DIR
    logger.info(f"Source directory: {source_dir}")
    logger.info(f"Target storage: {backend}")

    if args.dry_run:
        logger.info("DRY RUN mode enabled - no files will be uploaded")

    # 执行迁移
    migrate_files(source_dir, args.dry_run)


if __name__ == "__main__":
    main()
