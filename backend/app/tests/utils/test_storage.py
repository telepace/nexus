"""存储服务测试模块"""

import os
import tempfile
from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# 尝试导入boto3和moto
try:
    import boto3
    from botocore.exceptions import ClientError
    from moto import mock_s3

    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

    # 创建模拟类以满足导入需求
    class MockClientError(Exception):
        pass

    # 使用模拟的异常
    ClientError = MockClientError


from app.utils.storage.base import StorageService
from app.utils.storage.local import LocalStorageService
from app.utils.storage.r2 import BOTO3_AVAILABLE as R2_BOTO3_AVAILABLE
from app.utils.storage.r2 import CloudflareR2Service
from app.utils.storage.s3 import S3StorageService


class TestStorageServiceInterface:
    """存储服务接口通用测试"""

    def test_interface(self):
        """测试存储服务接口的方法定义"""
        # 接口应该包含这些方法
        assert hasattr(StorageService, "upload_file")
        assert hasattr(StorageService, "get_file_url")
        assert hasattr(StorageService, "delete_file")
        assert hasattr(StorageService, "file_exists")


class TestLocalStorageService:
    """本地存储服务测试"""

    @pytest.fixture
    def temp_dir(self):
        """创建临时目录用于测试"""
        with tempfile.TemporaryDirectory() as tmp_dir:
            yield tmp_dir

    @pytest.fixture
    def local_storage(self, temp_dir):
        """创建本地存储服务实例"""
        base_url = "/static"
        return LocalStorageService(base_dir=temp_dir, base_url=base_url)

    def test_upload_file(self, local_storage, temp_dir):
        """测试上传文件"""
        # 准备测试数据
        file_data = BytesIO(b"test file content")
        file_path = "test/example.txt"

        # 上传文件
        url = local_storage.upload_file(file_data, file_path)

        # 验证文件已保存到正确位置
        full_path = os.path.join(temp_dir, file_path)
        assert os.path.exists(full_path)
        with open(full_path, "rb") as f:
            assert f.read() == b"test file content"

        # 验证返回的URL格式正确
        assert url == "/static/test/example.txt"

    def test_get_file_url(self, local_storage):
        """测试获取文件URL"""
        file_path = "test/example.jpg"
        url = local_storage.get_file_url(file_path)
        assert url == "/static/test/example.jpg"

    def test_file_exists(self, local_storage, temp_dir):
        """测试检查文件是否存在"""
        # 创建测试文件
        test_file = os.path.join(temp_dir, "test.txt")
        Path(test_file).write_text("test")

        assert local_storage.file_exists("test.txt")
        assert not local_storage.file_exists("nonexistent.txt")

    def test_delete_file(self, local_storage, temp_dir):
        """测试删除文件"""
        # 创建测试文件
        test_path = "delete_test.txt"
        full_path = os.path.join(temp_dir, test_path)
        Path(full_path).parent.mkdir(parents=True, exist_ok=True)
        Path(full_path).write_text("test")

        # 验证文件存在
        assert os.path.exists(full_path)

        # 删除文件
        result = local_storage.delete_file(test_path)

        # 验证删除成功
        assert result is True
        assert not os.path.exists(full_path)

        # 测试删除不存在的文件
        result = local_storage.delete_file("nonexistent.txt")
        assert result is False


# 条件导入S3测试
if BOTO3_AVAILABLE:

    class TestS3StorageService:
        """S3存储服务测试"""

        @pytest.fixture
        def s3_mock(self):
            """设置S3 mock环境"""
            with mock_s3():
                # 创建S3客户端并设置测试桶
                s3_client = boto3.client(
                    "s3",
                    region_name="us-east-1",
                    aws_access_key_id="test",
                    aws_secret_access_key="test",
                )
                # 创建测试桶
                bucket_name = "test-bucket"
                s3_client.create_bucket(Bucket=bucket_name)

                yield s3_client, bucket_name

        @pytest.fixture
        def s3_storage(self, s3_mock):
            """创建S3存储服务实例"""
            s3_client, bucket_name = s3_mock
            return S3StorageService(
                aws_access_key_id="test",
                aws_secret_access_key="test",
                region="us-east-1",
                bucket=bucket_name,
                public_url="https://test-bucket.s3.amazonaws.com",
                endpoint_url=None,  # 默认AWS端点
            )

        def test_upload_file(self, s3_storage, s3_mock):
            """测试上传文件到S3"""
            s3_client, bucket_name = s3_mock
            file_data = BytesIO(b"test s3 content")
            file_path = "avatars/test.png"

            # 上传文件
            url = s3_storage.upload_file(file_data, file_path)

            # 验证文件已上传到S3
            response = s3_client.get_object(Bucket=bucket_name, Key=file_path)
            content = response["Body"].read()
            assert content == b"test s3 content"

            # 验证URL格式正确
            assert url == f"https://test-bucket.s3.amazonaws.com/{file_path}"

        def test_get_file_url(self, s3_storage):
            """测试获取S3文件URL"""
            file_path = "avatars/test.jpg"
            url = s3_storage.get_file_url(file_path)
            assert url == f"https://test-bucket.s3.amazonaws.com/{file_path}"

        def test_file_exists(self, s3_storage, s3_mock):
            """测试检查S3文件是否存在"""
            s3_client, bucket_name = s3_mock
            test_key = "avatars/exists.txt"

            # 上传测试文件
            s3_client.put_object(Bucket=bucket_name, Key=test_key, Body=b"test")

            # 验证文件存在性检查
            assert s3_storage.file_exists(test_key)
            assert not s3_storage.file_exists("avatars/nonexistent.txt")

        def test_delete_file(self, s3_storage, s3_mock):
            """测试删除S3文件"""
            s3_client, bucket_name = s3_mock
            test_key = "avatars/to_delete.txt"

            # 上传测试文件
            s3_client.put_object(Bucket=bucket_name, Key=test_key, Body=b"test")

            # 删除文件
            result = s3_storage.delete_file(test_key)
            assert result is True

            # 验证文件已被删除
            with pytest.raises((ClientError, Exception)):
                s3_client.head_object(Bucket=bucket_name, Key=test_key)

            # 删除不存在的文件应返回False
            assert not s3_storage.delete_file("avatars/nonexistent.txt")
else:
    # 如果boto3不可用，创建一个跳过提示
    @pytest.mark.skip("boto3 not installed, skipping S3 tests")
    def test_s3_skipped():
        """S3测试被跳过的提示"""
        pass


# 为R2测试添加条件
if R2_BOTO3_AVAILABLE:

    class TestCloudflareR2Service:
        """Cloudflare R2服务测试"""

        @pytest.fixture
        def r2_storage(self):
            """创建R2存储服务mock实例"""
            # 使用mock来模拟R2服务，因为没有专门的R2 moto
            with patch("app.utils.storage.r2.boto3") as mock_boto3:
                mock_client = MagicMock()
                mock_boto3.client.return_value = mock_client

                storage = CloudflareR2Service(
                    account_id="test-account",
                    access_key_id="test-key",
                    secret_access_key="test-secret",
                    bucket="test-r2-bucket",
                    public_url="https://test-bucket.my-account.r2.cloudflarestorage.com",
                )
                yield storage, mock_client

        def test_client_initialization(self, r2_storage):
            """测试R2客户端初始化"""
            storage, mock_client = r2_storage
            assert storage.bucket == "test-r2-bucket"
            assert (
                storage.public_url
                == "https://test-bucket.my-account.r2.cloudflarestorage.com"
            )

        def test_upload_file(self, r2_storage):
            """测试上传文件到R2"""
            storage, mock_client = r2_storage
            file_data = BytesIO(b"test r2 content")
            file_path = "avatars/test.png"

            # 上传文件
            url = storage.upload_file(file_data, file_path)

            # 验证调用了R2的put_object方法
            mock_client.put_object.assert_called_once()
            call_args = mock_client.put_object.call_args
            assert call_args[1]["Bucket"] == "test-r2-bucket"
            assert call_args[1]["Key"] == file_path

            # 验证URL格式正确
            assert (
                url
                == f"https://test-bucket.my-account.r2.cloudflarestorage.com/{file_path}"
            )

        def test_get_file_url(self, r2_storage):
            """测试获取R2文件URL"""
            storage, _ = r2_storage
            file_path = "avatars/test.jpg"
            url = storage.get_file_url(file_path)
            assert (
                url
                == f"https://test-bucket.my-account.r2.cloudflarestorage.com/{file_path}"
            )

        def test_file_exists(self, r2_storage):
            """测试检查R2文件是否存在"""
            storage, mock_client = r2_storage

            # 模拟文件存在
            mock_client.head_object.side_effect = [None, Exception("Not found")]

            assert storage.file_exists("avatars/exists.txt")
            assert not storage.file_exists("avatars/nonexistent.txt")

        def test_delete_file(self, r2_storage):
            """测试删除R2文件"""
            storage, mock_client = r2_storage

            # 设置第一次删除成功，第二次抛出异常
            mock_client.delete_object.side_effect = [None, Exception("Not found")]

            assert storage.delete_file("avatars/exists.txt")
            assert not storage.delete_file("avatars/nonexistent.txt")
else:
    # 如果boto3不可用，跳过R2测试
    @pytest.mark.skip("boto3 not installed, skipping R2 tests")
    def test_r2_skipped():
        """R2测试被跳过的提示"""
        pass
