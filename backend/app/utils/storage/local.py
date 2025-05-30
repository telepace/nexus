"""本地文件系统存储服务实现"""

import os
from io import BytesIO

from app.utils.storage.base import StorageService


class LocalStorageService(StorageService):
    """本地文件系统存储服务

    将文件存储到本地文件系统，适用于开发环境或单节点部署。
    """

    def __init__(self, base_dir: str, base_url: str = "/static"):
        """初始化本地存储服务

        Args:
            base_dir: 存储文件的基础目录路径
            base_url: 访问文件的基础URL路径
        """
        self.base_dir = base_dir
        self.base_url = base_url.rstrip("/")

    def upload_file(self, file_data: BytesIO | bytes, file_path: str) -> str:
        """上传文件到本地存储

        Args:
            file_data: 文件数据，可以是BytesIO或bytes
            file_path: 相对文件路径

        Returns:
            str: 文件URL
        """
        # 确保目标目录存在
        target_path = os.path.join(self.base_dir, file_path)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        # 写入文件
        if isinstance(file_data, BytesIO):
            # 如果是BytesIO，保存当前位置，后续可以恢复
            current_pos = file_data.tell()
            file_data.seek(0)
            with open(target_path, "wb") as f:
                f.write(file_data.read())
            # 恢复原来的位置
            file_data.seek(current_pos)
        else:
            # 如果是bytes，直接写入
            with open(target_path, "wb") as f:
                f.write(file_data)

        # 返回文件URL
        return f"{self.base_url}/{file_path}"

    def get_file_url(self, file_path: str) -> str:
        """获取文件URL

        Args:
            file_path: 相对文件路径

        Returns:
            str: 文件URL
        """
        return f"{self.base_url}/{file_path}"

    def delete_file(self, file_path: str) -> bool:
        """删除文件

        Args:
            file_path: 相对文件路径

        Returns:
            bool: 删除成功返回True，文件不存在或删除失败返回False
        """
        full_path = os.path.join(self.base_dir, file_path)
        try:
            if os.path.exists(full_path):
                os.remove(full_path)
                return True
            return False
        except Exception:
            return False

    def file_exists(self, file_path: str) -> bool:
        """检查文件是否存在

        Args:
            file_path: 相对文件路径

        Returns:
            bool: 文件存在返回True，否则返回False
        """
        target_path = os.path.join(self.base_dir, file_path)
        return os.path.exists(target_path)

    def download_file(self, file_path: str) -> bytes:
        """从本地存储下载文件

        Args:
            file_path: 相对文件路径

        Returns:
            bytes: 文件内容

        Raises:
            FileNotFoundError: 如果文件不存在
            Exception: 其他读取错误
        """
        target_path = os.path.join(self.base_dir, file_path)

        if not os.path.exists(target_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            with open(target_path, "rb") as f:
                return f.read()
        except Exception as e:
            raise Exception(f"Failed to read file {file_path}: {str(e)}")

    def get_presigned_url(self, file_path: str, content_type: str) -> str:
        """
        Generates a presigned URL for local storage.
        Local storage does not support presigned URLs in the same way as cloud storage.
        This method can either return a direct file path or raise NotImplementedError.
        """
        # Option 1: Raise NotImplementedError (more accurate for "presigned")
        raise NotImplementedError(
            "Presigned URLs are not applicable for local storage."
        )

        # Option 2: Return a direct URL/path (if that fits the use case)
        # This might be useful if the client expects a URL it can try to use,
        # even if it's just a local file path.
        # return f"file://{os.path.join(self.base_dir, file_path)}"
