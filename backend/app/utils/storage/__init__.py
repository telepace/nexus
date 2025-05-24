"""存储服务模块"""

from enum import Enum

from app.core.config import settings
from app.utils.storage.base import StorageService
from app.utils.storage.local import LocalStorageService
from app.utils.storage.r2 import CloudflareR2Service
from app.utils.storage.s3 import S3StorageService


class StorageBackend(str, Enum):
    """存储后端类型枚举"""

    LOCAL = "local"
    S3 = "s3"
    R2 = "r2"


def get_storage_service() -> StorageService:
    """根据配置获取存储服务实例

    根据环境变量STORAGE_BACKEND选择使用的存储后端。
    默认使用本地文件系统存储。

    Returns:
        StorageService: 存储服务实例
    """
    backend = getattr(settings, "STORAGE_BACKEND", StorageBackend.LOCAL)

    if backend == StorageBackend.R2:
        # 使用Cloudflare R2
        return CloudflareR2Service(
            account_id=settings.R2_ACCOUNT_ID,
            access_key_id=settings.R2_ACCESS_KEY_ID,
            secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            bucket=settings.R2_BUCKET,
            public_url=settings.R2_PUBLIC_URL,
        )
    elif backend == StorageBackend.S3:
        # 使用通用S3存储
        return S3StorageService(
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            bucket=settings.S3_BUCKET,
            region=settings.S3_REGION,
            public_url=settings.S3_PUBLIC_URL,
            endpoint_url=settings.S3_ENDPOINT_URL,
        )
    else:
        # 默认使用本地存储
        return LocalStorageService(
            base_dir=settings.STATIC_DIR, base_url=settings.STATIC_URL or "/static"
        )
