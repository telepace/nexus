"""图片处理工具测试模块"""

import os
import uuid
from io import BytesIO

import pytest
from PIL import Image

from app.utils.image_utils import AvatarGenerator


@pytest.mark.asyncio
async def test_generate_random_avatar():
    """测试随机头像生成"""
    # 生成随机头像
    email = "test@example.com"
    img_data = await AvatarGenerator.generate_random_avatar(email)

    # 验证返回的是BytesIO对象
    assert isinstance(img_data, BytesIO)

    # 验证可以作为图片打开
    img = Image.open(img_data)
    assert img.size == (200, 200)  # 验证尺寸正确


@pytest.mark.asyncio
async def test_github_avatar():
    """测试GitHub头像获取"""
    # 测试获取GitHub风格头像
    email = "test@example.com"
    img_data = await AvatarGenerator.get_github_avatar(email)

    # 这可能会失败，因为依赖外部API，所以我们只验证在成功时的结果
    if img_data is not None:
        assert isinstance(img_data, BytesIO)
        img = Image.open(img_data)
        assert img.size[0] > 0
        assert img.size[1] > 0


@pytest.mark.asyncio
async def test_picsum_avatar():
    """测试Lorem Picsum头像获取"""
    # 测试获取Lorem Picsum随机图片
    img_data = await AvatarGenerator.get_picsum_avatar()

    # 这可能会失败，因为依赖外部API，所以我们只验证在成功时的结果
    if img_data is not None:
        assert isinstance(img_data, BytesIO)
        img = Image.open(img_data)
        assert img.size == (200, 200)  # 验证尺寸正确


def test_local_avatar():
    """测试本地预设头像"""
    # 测试获取本地预设头像
    img_data = AvatarGenerator.get_local_avatar()

    # 验证返回的是BytesIO对象
    assert isinstance(img_data, BytesIO)

    # 验证可以作为图片打开
    img = Image.open(img_data)
    assert img.size == (200, 200)  # 验证尺寸正确


@pytest.mark.asyncio
async def test_default_avatar_flow():
    """测试默认头像获取流程"""
    # 测试默认头像获取流程
    email = "test@example.com"
    user_id = str(uuid.uuid4())

    # 获取默认头像
    url, img_data = await AvatarGenerator.get_default_avatar(email, user_id)

    # 验证URL内容有效（或者包含正确的文件名）
    assert user_id in url, f"URL should contain user_id: {url}"

    # 验证返回的是BytesIO对象
    assert isinstance(img_data, BytesIO)

    # 验证可以作为图片打开
    img = Image.open(img_data)
    assert img.size == (200, 200)  # 验证尺寸正确

    # 验证文件是否已保存（仅当使用本地存储时适用）
    from app.core.config import settings

    if settings.STORAGE_BACKEND == "local":
        file_path = os.path.join(settings.STATIC_DIR, "avatars", f"{user_id}.png")
        assert os.path.exists(file_path), f"File {file_path} should exist"
