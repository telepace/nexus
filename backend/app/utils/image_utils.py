"""
头像生成和处理工具

提供多种头像生成策略，支持：
- 本地生成简单头像
- 从GitHub获取头像
- 使用Lorem Picsum随机图片
- 本地预设头像库
"""

import hashlib
import logging
import os
import random
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image, ImageDraw, ImageFont

from app.core.config import settings

logger = logging.getLogger(__name__)

# 预设颜色，用于生成随机头像
COLORS = [
    "#1abc9c",
    "#2ecc71",
    "#3498db",
    "#9b59b6",
    "#34495e",
    "#16a085",
    "#27ae60",
    "#2980b9",
    "#8e44ad",
    "#2c3e50",
    "#f1c40f",
    "#e67e22",
    "#e74c3c",
    "#f39c12",
    "#d35400",
    "#c0392b",
    "#bdc3c7",
    "#7f8c8d",
]

# 头像尺寸
AVATAR_SIZE = (200, 200)

# 本地预设头像目录
LOCAL_AVATARS_DIR = Path(settings.STATIC_DIR) / "avatars" / "presets"


class AvatarGenerator:
    """头像生成器，支持多种头像生成策略"""

    @staticmethod
    async def generate_random_avatar(
        text: str, save_path: str | None = None
    ) -> BytesIO:
        """生成一个基于文本的简单随机头像

        Args:
            text: 用于生成头像的文本（通常是用户名或邮箱）
            save_path: 可选的保存路径

        Returns:
            BytesIO: 图片数据缓冲区
        """
        # 使用文本的哈希值选择背景颜色
        hash_object = hashlib.md5(text.encode())
        hash_hex = hash_object.hexdigest()
        color_index = int(hash_hex, 16) % len(COLORS)
        bg_color = COLORS[color_index]

        # 创建图像
        img = Image.new("RGB", AVATAR_SIZE, bg_color)
        draw = ImageDraw.Draw(img)

        # 获取文本的首字母作为头像显示
        display_text = text[0].upper() if text else "?"

        # 尝试加载字体，如果失败，使用默认字体
        try:
            font_size = 100
            font = ImageFont.truetype("arial.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()
            font_size = 80

        # 计算文本位置使其居中
        text_width, text_height = draw.textsize(display_text, font=font)
        position = (
            (AVATAR_SIZE[0] - text_width) / 2,
            (AVATAR_SIZE[1] - text_height) / 2 - font_size / 10,
        )

        # 绘制文本
        text_color = "white"
        draw.text(position, display_text, fill=text_color, font=font)

        # 保存文件（如果提供了路径）
        if save_path:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            img.save(save_path)

        # 返回图片数据
        img_byte_array = BytesIO()
        img.save(img_byte_array, format="PNG")
        img_byte_array.seek(0)
        return img_byte_array

    @staticmethod
    async def get_github_avatar(
        email: str, save_path: str | None = None
    ) -> BytesIO | None:
        """通过GitHub API获取用户头像

        Args:
            email: 用户邮箱
            save_path: 可选的保存路径

        Returns:
            BytesIO: 图片数据缓冲区，获取失败时返回None
        """
        try:
            # 根据邮箱的md5哈希获取GitHub风格的头像
            email_hash = hashlib.md5(email.lower().encode()).hexdigest()
            url = f"https://www.gravatar.com/avatar/{email_hash}?d=identicon&s={AVATAR_SIZE[0]}"

            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=5.0)
                if response.status_code == 200:
                    img_data = BytesIO(response.content)

                    # 保存文件（如果提供了路径）
                    if save_path:
                        os.makedirs(os.path.dirname(save_path), exist_ok=True)
                        with open(save_path, "wb") as f:
                            f.write(response.content)

                    return img_data
        except Exception as e:
            logger.error(f"Failed to get GitHub avatar: {e}")

        return None

    @staticmethod
    async def get_picsum_avatar(save_path: str | None = None) -> BytesIO | None:
        """从Lorem Picsum获取随机图片作为头像

        Args:
            save_path: 可选的保存路径

        Returns:
            BytesIO: 图片数据缓冲区，获取失败时返回None
        """
        try:
            size = AVATAR_SIZE[0]
            url = f"https://picsum.photos/{size}"

            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=5.0, follow_redirects=True)
                if response.status_code == 200:
                    img_data = BytesIO(response.content)

                    # 处理图像，确保它是正方形
                    with Image.open(img_data) as img:
                        # 裁剪为正方形
                        width, height = img.size
                        size = min(width, height)
                        left = (width - size) // 2
                        top = (height - size) // 2
                        right = left + size
                        bottom = top + size
                        img = img.crop((left, top, right, bottom))

                        # 调整大小
                        img = img.resize(AVATAR_SIZE, Image.LANCZOS)

                        # 保存结果
                        output = BytesIO()
                        img.save(output, format="PNG")
                        output.seek(0)

                        # 如果提供了保存路径，保存到文件
                        if save_path:
                            os.makedirs(os.path.dirname(save_path), exist_ok=True)
                            img.save(save_path)

                        return output
        except Exception as e:
            logger.error(f"Failed to get Picsum avatar: {e}")

        return None

    @staticmethod
    def get_local_avatar(save_path: str | None = None) -> BytesIO | None:
        """从本地预设头像库中随机选择一个头像

        Args:
            save_path: 可选的保存路径

        Returns:
            BytesIO: 图片数据缓冲区，获取失败时返回None
        """
        try:
            # 确保预设头像目录存在
            os.makedirs(LOCAL_AVATARS_DIR, exist_ok=True)

            # 获取所有预设头像文件
            preset_files = list(LOCAL_AVATARS_DIR.glob("*.png")) + list(
                LOCAL_AVATARS_DIR.glob("*.jpg")
            )

            # 如果没有预设头像，创建一些默认的
            if not preset_files:
                logger.info("No preset avatars found, creating defaults")
                AvatarGenerator._create_default_presets()
                preset_files = list(LOCAL_AVATARS_DIR.glob("*.png"))

            if preset_files:
                # 随机选择一个预设头像
                avatar_file = random.choice(preset_files)

                # 读取图片
                img = Image.open(avatar_file)
                img = img.resize(AVATAR_SIZE, Image.LANCZOS)

                # 输出到 BytesIO
                output = BytesIO()
                img.save(output, format="PNG")
                output.seek(0)

                # 如果提供了保存路径，保存到文件
                if save_path:
                    os.makedirs(os.path.dirname(save_path), exist_ok=True)
                    img.save(save_path)

                return output
        except Exception as e:
            logger.error(f"Failed to get local avatar: {e}")

        return None

    @staticmethod
    def _create_default_presets() -> None:
        """创建默认的预设头像"""
        os.makedirs(LOCAL_AVATARS_DIR, exist_ok=True)

        # 创建10个简单的预设头像
        for i in range(10):
            color = COLORS[i % len(COLORS)]
            img = Image.new("RGB", AVATAR_SIZE, color)
            draw = ImageDraw.Draw(img)

            # 绘制简单图案
            draw.ellipse([(40, 40), (160, 160)], fill="white")

            # 保存
            img.save(os.path.join(LOCAL_AVATARS_DIR, f"preset_{i}.png"))

    @staticmethod
    async def get_default_avatar(email: str, user_id: str) -> tuple[str, BytesIO]:
        """获取默认头像，尝试多种策略

        Args:
            email: 用户邮箱
            user_id: 用户ID，用于文件命名

        Returns:
            Tuple[str, BytesIO]: (相对URL路径, 图片数据缓冲区)
        """
        # 确保上传目录存在
        upload_dir = os.path.join(settings.STATIC_DIR, "avatars")
        os.makedirs(upload_dir, exist_ok=True)

        # 生成文件名
        file_name = f"{user_id}.png"
        save_path = os.path.join(upload_dir, file_name)
        relative_url = f"/static/avatars/{file_name}"

        # 尝试获取GitHub头像
        img_data = await AvatarGenerator.get_github_avatar(email, save_path)

        # 如果GitHub头像失败，尝试Lorem Picsum
        if img_data is None:
            img_data = await AvatarGenerator.get_picsum_avatar(save_path)

        # 如果外部API都失败，使用本地预设
        if img_data is None:
            img_data = AvatarGenerator.get_local_avatar(save_path)

        # 如果还是失败，生成一个简单的随机头像
        if img_data is None:
            img_data = await AvatarGenerator.generate_random_avatar(email, save_path)

        return relative_url, img_data
