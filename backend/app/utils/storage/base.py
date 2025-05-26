"""存储服务基础模块，定义存储服务接口"""

from abc import ABC, abstractmethod
from io import BytesIO


class StorageService(ABC):
    """存储服务抽象接口

    定义了所有存储服务必须实现的方法。
    """

    @abstractmethod
    def upload_file(self, file_data: BytesIO | bytes, file_path: str) -> str:
        """上传文件到存储服务

        Args:
            file_data: 文件数据，可以是BytesIO或bytes
            file_path: 文件在存储中的路径，包括文件名

        Returns:
            str: 上传后的文件URL
        """
        pass

    @abstractmethod
    def download_file(self, file_path: str) -> bytes:
        """从存储服务下载文件

        Args:
            file_path: 文件在存储中的路径，包括文件名

        Returns:
            bytes: 文件内容

        Raises:
            FileNotFoundError: 如果文件不存在
            Exception: 其他下载错误
        """
        pass

    @abstractmethod
    def get_file_url(self, file_path: str) -> str:
        """获取文件URL

        Args:
            file_path: 文件在存储中的路径，包括文件名

        Returns:
            str: 文件的公共访问URL
        """
        pass

    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """删除文件

        Args:
            file_path: 文件在存储中的路径，包括文件名

        Returns:
            bool: 删除成功返回True，文件不存在或删除失败返回False
        """
        pass

    @abstractmethod
    def file_exists(self, file_path: str) -> bool:
        """检查文件是否存在

        Args:
            file_path: 文件在存储中的路径，包括文件名

        Returns:
            bool: 文件存在返回True，否则返回False
        """
        pass
