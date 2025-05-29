"""S3 兼容存储服务实现"""

from io import BytesIO
from typing import Any

from app.utils.storage.base import StorageService


# 首先定义 MockClientError，确保它总是可用
class MockClientError(Exception):
    """模拟的ClientError异常"""

    pass


try:
    import boto3
    from botocore.exceptions import ClientError

    BOTO3_AVAILABLE = True
except ImportError:
    # 创建模拟对象，用于在boto3不可用时提供基本功能
    BOTO3_AVAILABLE = False
    ClientError = MockClientError  # noqa: F811


class S3StorageService(StorageService):
    """S3 兼容存储服务

    支持AWS S3或其他兼容S3 API的存储服务。
    """

    def __init__(
        self,
        aws_access_key_id: str,
        aws_secret_access_key: str,
        bucket: str,
        region: str,
        public_url: str,
        endpoint_url: str | None = None,
    ):
        """初始化S3存储服务

        Args:
            aws_access_key_id: AWS 访问密钥ID
            aws_secret_access_key: AWS 私密访问密钥
            bucket: S3存储桶名称
            region: AWS区域名称
            public_url: 公共访问的基础URL
            endpoint_url: 自定义S3端点URL，用于非AWS S3服务
        """
        self.bucket = bucket
        self.public_url = public_url.rstrip("/")

        if BOTO3_AVAILABLE:
            self.client = boto3.client(
                "s3",
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=region,
                endpoint_url=endpoint_url,
            )
        else:
            # 创建模拟客户端
            self.client = MockS3Client(bucket)

    def upload_file(self, file_data: BytesIO | bytes, file_path: str) -> str:
        """上传文件到S3存储

        Args:
            file_data: 文件数据，可以是BytesIO或bytes
            file_path: S3中的文件键路径

        Returns:
            str: 文件URL
        """
        # 如果是BytesIO，获取当前位置，稍后恢复
        if isinstance(file_data, BytesIO):
            current_pos = file_data.tell()
            file_data.seek(0)
            self.client.upload_fileobj(file_data, self.bucket, file_path)
            file_data.seek(current_pos)
        else:
            self.client.put_object(Bucket=self.bucket, Key=file_path, Body=file_data)

        # 返回文件URL
        return self._build_url(file_path)

    def get_file_url(self, file_path: str) -> str:
        """获取S3文件URL

        Args:
            file_path: S3中的文件键路径

        Returns:
            str: 文件URL
        """
        return self._build_url(file_path)

    def delete_file(self, file_path: str) -> bool:
        """删除S3文件

        Args:
            file_path: S3中的文件键路径

        Returns:
            bool: 删除成功返回True，文件不存在或删除失败返回False
        """
        try:
            self.client.delete_object(Bucket=self.bucket, Key=file_path)
            return True
        except Exception:
            return False

    def file_exists(self, file_path: str) -> bool:
        """检查S3文件是否存在

        Args:
            file_path: S3中的文件键路径

        Returns:
            bool: 文件存在返回True，否则返回False
        """
        try:
            self.client.head_object(Bucket=self.bucket, Key=file_path)
            return True
        except ClientError:
            return False

    def download_file(self, file_path: str) -> bytes:
        """从S3下载文件

        Args:
            file_path: S3中的文件键路径

        Returns:
            bytes: 文件内容

        Raises:
            FileNotFoundError: 如果文件不存在
            Exception: 其他下载错误
        """
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=file_path)
            return response["Body"].read()
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                raise FileNotFoundError(f"File not found: {file_path}")
            else:
                raise Exception(f"Failed to download file {file_path}: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to download file {file_path}: {str(e)}")

    def _build_url(self, file_path: str) -> str:
        """构建文件的公共URL

        Args:
            file_path: S3中的文件键路径

        Returns:
            str: 文件URL
        """
        return f"{self.public_url}/{file_path}"

    def get_presigned_url(
        self, file_path: str, content_type: str, expires_in: int = 3600
    ) -> str | None:
        """生成用于上传的预签名URL

        Args:
            file_path: S3中的文件键路径
            content_type: 文件的MIME类型
            expires_in: URL的有效时间（秒），默认为3600秒

        Returns:
            str: 预签名URL，如果boto3不可用则返回None
        """
        if not BOTO3_AVAILABLE:
            return None  # 或者根据需要抛出异常

        try:
            # 确保 client 是 boto3 客户端实例
            if not hasattr(self.client, "generate_presigned_url"):
                 # 当 self.client 是 MockS3Client 时，它没有 generate_presigned_url 方法
                return f"mock_presigned_url_for_s3/{self.bucket}/{file_path}?content_type={content_type}"


            params = {
                "Bucket": self.bucket,
                "Key": file_path,
                "ContentType": content_type,
            }
            # generate_presigned_post有时更适合上传，但generate_presigned_url(ClientMethod='put_object')更直接
            url = self.client.generate_presigned_url(
                ClientMethod="put_object",
                Params=params,
                ExpiresIn=expires_in,
            )
            return url
        except ClientError as e:
            # 处理可能的错误，例如权限问题
            print(f"Error generating presigned URL for S3: {e}")
            return None
        except Exception as e:
            # 捕获其他潜在错误
            print(f"An unexpected error occurred when generating presigned URL for S3: {e}")
            return None


# 当boto3不可用时使用的模拟实现
class MockS3Client:
    """模拟S3客户端，用于测试或boto3不可用的情况"""

    def __init__(self, bucket_name: str):
        """初始化模拟S3客户端

        Args:
            bucket_name: 存储桶名称
        """
        self.bucket_name = bucket_name
        self.objects: dict[str, bytes] = {}

    def upload_fileobj(
        self, file_obj: BytesIO, bucket: str, key: str, **kwargs: Any
    ) -> None:
        """模拟上传文件对象

        Args:
            file_obj: 文件对象
            bucket: 存储桶名称
            key: 文件键
            **kwargs: 额外参数
        """
        self.objects[key] = file_obj.read()

    def put_object(
        self, Bucket: str, Key: str, Body: bytes, **kwargs: Any
    ) -> dict[str, Any]:
        """模拟上传对象

        Args:
            Bucket: 存储桶名称
            Key: 文件键
            Body: 文件内容
            **kwargs: 额外参数

        Returns:
            dict: 模拟响应
        """
        if isinstance(Body, bytes):
            self.objects[Key] = Body
        else:
            # 如果不是bytes类型，尝试转换
            self.objects[Key] = Body if hasattr(Body, "encode") else str(Body).encode()
        return {"ETag": "mock-etag"}

    def head_object(self, Bucket: str, Key: str) -> dict[str, Any]:
        """模拟检查对象是否存在

        Args:
            Bucket: 存储桶名称
            Key: 文件键

        Returns:
            dict: 模拟响应

        Raises:
            ClientError: 如果文件不存在
        """
        if Key not in self.objects:
            raise ClientError(
                {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadObject"
            )
        return {
            "ContentLength": len(self.objects[Key]),
            "LastModified": "mock-date",
        }

    def delete_object(self, Bucket: str, Key: str) -> dict[str, Any]:
        """模拟删除对象

        Args:
            Bucket: 存储桶名称
            Key: 文件键

        Returns:
            dict: 模拟响应
        """
        if Key in self.objects:
            del self.objects[Key]
        return {}

    def get_object(self, Bucket: str, Key: str) -> dict[str, Any]:
        """模拟获取对象

        Args:
            Bucket: 存储桶名称
            Key: 文件键

        Returns:
            dict: 模拟响应，包含 Body 字段

        Raises:
            ClientError: 如果文件不存在
        """
        if Key not in self.objects:
            raise ClientError(
                {
                    "Error": {
                        "Code": "NoSuchKey",
                        "Message": "The specified key does not exist.",
                    }
                },
                "GetObject",
            )

        # 创建一个模拟的 Body 对象
        class MockBody:
            def __init__(self, data: bytes):
                self.data = data

            def read(self) -> bytes:
                return self.data

        return {
            "Body": MockBody(self.objects[Key]),
            "ContentLength": len(self.objects[Key]),
            "LastModified": "mock-date",
        }
