"""Cloudflare R2存储服务实现"""

import mimetypes
from io import BytesIO

# 在R2模块中也添加boto3条件导入
try:
    import boto3

    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

    # 创建boto3模块的模拟，使测试可以进行
    class MockBoto3:
        @staticmethod
        def client(*args, **kwargs):
            return None

    boto3 = MockBoto3()  # 提供一个虚拟的boto3对象

from app.utils.storage.s3 import S3StorageService


class CloudflareR2Service(S3StorageService):
    """Cloudflare R2存储服务

    R2是Cloudflare提供的兼容S3 API的对象存储服务。
    """

    def __init__(
        self,
        account_id: str,
        access_key_id: str,
        secret_access_key: str,
        bucket: str,
        public_url: str,
    ):
        """初始化Cloudflare R2存储服务

        Args:
            account_id: Cloudflare账户ID
            access_key_id: R2访问密钥ID
            secret_access_key: R2私密访问密钥
            bucket: R2存储桶名称
            public_url: 公共访问的基础URL
        """
        # 构建R2 API端点URL
        endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"

        # 调用父类初始化方法
        super().__init__(
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            bucket=bucket,
            region="auto",  # R2不需要区域，使用auto
            public_url=public_url,
            endpoint_url=endpoint_url,
        )

        # 保存特定于R2的设置
        self.account_id = account_id

    def upload_file(self, file_data: BytesIO | bytes, file_path: str) -> str:
        """上传文件到R2存储

        Args:
            file_data: 文件数据，可以是BytesIO或bytes
            file_path: R2中的文件键路径

        Returns:
            str: 文件URL
        """
        # 如果是BytesIO，获取当前位置，稍后恢复
        if isinstance(file_data, BytesIO):
            # 检查文件是否已关闭
            if file_data.closed:
                raise ValueError("Cannot upload from closed BytesIO object")

            current_pos = file_data.tell()
            file_data.seek(0)

            # 设置内容类型
            content_type = self._guess_content_type(file_path)
            extra_args = {"ContentType": content_type} if content_type else {}

            self.client.upload_fileobj(
                file_data, self.bucket, file_path, ExtraArgs=extra_args
            )

            # 安全地恢复位置（只有在文件仍然打开时）
            if not file_data.closed:
                file_data.seek(current_pos)
        else:
            # 设置内容类型
            content_type = self._guess_content_type(file_path)
            extra_args = {"ContentType": content_type} if content_type else {}

            self.client.put_object(
                Bucket=self.bucket, Key=file_path, Body=file_data, **extra_args
            )

        # 返回文件URL
        return self._build_url(file_path)

    def _guess_content_type(self, file_path: str) -> str | None:
        """根据文件扩展名猜测内容类型

        Args:
            file_path: 文件路径

        Returns:
            str: 内容类型字符串，如果无法确定则返回None
        """
        content_type, _ = mimetypes.guess_type(file_path)
        if content_type:
            return content_type

        # 处理特定图片类型
        extension = file_path.lower().split(".")[-1] if "." in file_path else ""
        if extension == "jpg" or extension == "jpeg":
            return "image/jpeg"
        elif extension == "png":
            return "image/png"
        elif extension == "gif":
            return "image/gif"
        elif extension == "webp":
            return "image/webp"

        # 默认类型
        return "application/octet-stream"
