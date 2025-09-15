"""
Enhanced content processors using Microsoft MarkItDown for various content types.

This module provides a modern, extensible content processing system that:
1. Uses Microsoft MarkItDown for robust file conversion
2. Implements R2 cloud storage with organized bucket structure
3. Supports processing pipelines for future LLM integration
4. Provides extensibility for tools like jina.ai, TAVILY, etc.
"""

import asyncio
import json
import logging
import os
import tempfile
import uuid
from abc import ABC, abstractmethod
from collections.abc import Coroutine
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

import requests
from markitdown import MarkItDown
from sqlmodel import Session

from app.core.config import settings
from app.models.content import ContentAsset, ContentItem
from app.utils.content_chunker import chunk_content_for_item
from app.utils.storage import get_storage_service

logger = logging.getLogger(__name__)


def clean_content_for_db(content: str) -> str:
    """Clean content to make it safe for PostgreSQL storage.

    Removes NUL bytes and other problematic characters that PostgreSQL cannot handle.
    """
    if not content:
        return content

    # Remove NUL bytes (0x00) which PostgreSQL cannot store in text fields
    cleaned = content.replace("\x00", "")

    # Remove other control characters that might cause issues
    import re

    # Remove control characters except for common ones like \n, \r, \t
    cleaned = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", cleaned)

    # Ensure the content is valid UTF-8
    try:
        cleaned = cleaned.encode("utf-8", errors="ignore").decode("utf-8")
    except UnicodeError:
        # If there are still encoding issues, fall back to ASCII
        cleaned = cleaned.encode("ascii", errors="ignore").decode("ascii")

    return cleaned


# ----------------- 新增实用工具函数 -----------------


def _looks_like_binary(data: bytes) -> bool:
    """Quick heuristic to judge whether given bytes are binary-like.

    1. If NUL bytes are present, treat as binary.
    2. If more than 30% of bytes are non-printable ASCII (0x20-0x7E) and not common whitespace, treat as binary.
    """
    if b"\x00" in data:
        return True

    # Count non-printable characters
    non_printable = sum(1 for b in data if b < 9 or (b > 13 and b < 32) or b > 126)
    if len(data) == 0:
        return False
    return (non_printable / len(data)) > 0.3


def is_gibberish(text: str) -> bool:
    """Heuristic to detect gibberish/garbled text.

    We treat text as gibberish when:
    1. The printable ratio is below 30% (进一步降低阈值，避免误判中文内容).
    2. Or, length > 3000 and unique character count < 15 (提高长度阈值，降低字符数阈值).
    3. 但排除常见的正常模式，如HTML标签、URL、邮箱、中文等
    4. 检测二进制内容和特殊乱码字符
    """
    if not text:
        return True

    # 检查二进制内容（控制字符过多）
    control_chars = sum(1 for ch in text if ord(ch) < 32 and ch not in "\n\r\t")
    if len(text) > 0 and control_chars / len(text) > 0.1:  # 超过10%的控制字符
        return True

    # 检查是否包含常见的正常内容模式
    import re

    # 如果包含HTML标签、URL、邮箱、中文等，可能是正常内容
    normal_patterns = [
        r"<[^>]+>",  # HTML标签
        r"https?://[^\s]+",  # URL
        r"\w+@\w+\.\w+",  # 邮箱
        r"[\u4e00-\u9fff]+",  # 中文字符
        r"[a-zA-Z]{3,}",  # 英文单词
        r"\d{4}-\d{2}-\d{2}",  # 日期格式
        r'[。，！？；：""' "（）【】《》]",  # 中文标点
    ]

    normal_content_score = 0
    for pattern in normal_patterns:
        matches = re.findall(pattern, text)
        if matches:
            if pattern == r"[\u4e00-\u9fff]+":  # 中文字符权重更高
                normal_content_score += len("".join(matches)) * 2
            elif pattern == r"[a-zA-Z]{3,}":  # 英文单词
                normal_content_score += len(matches) * 3
            else:
                normal_content_score += len(matches)

    # 检测特殊乱码字符（如拉丁扩展字符的大量集中出现）
    latin_extended_chars = sum(1 for ch in text if 192 <= ord(ch) <= 255)  # À-ÿ
    if (
        len(text) > 0 and latin_extended_chars / len(text) > 0.3
    ):  # 超过30%的拉丁扩展字符
        # 但如果有正常内容模式，可能是正常的多语言文本
        if normal_content_score < len(text) * 0.05:  # 正常内容占比低于5%
            return True

    # 如果包含足够的正常内容模式，降低乱码判断标准
    if normal_content_score > len(text) * 0.1:  # 正常内容占比超过10%
        # 只有在极低的可打印比例时才认为是乱码
        printable = sum(
            1 for ch in text if 32 <= ord(ch) <= 126 or ch in "\n\r\t" or ord(ch) > 127
        )
        ratio = printable / len(text)
        if ratio < 0.15:  # 极低阈值
            return True
        return False

    # 对于不包含明显正常模式的文本，使用宽松的标准
    printable = sum(
        1 for ch in text if 32 <= ord(ch) <= 126 or ch in "\n\r\t" or ord(ch) > 127
    )
    ratio = printable / len(text)
    if ratio < 0.3:  # 降低阈值从0.5到0.3
        return True

    # 提高重复字符的检测阈值，避免误判正常重复内容
    if len(text) > 3000 and len(set(text)) < 15:  # 提高长度阈值，降低字符数阈值
        return True

    return False


def get_enhanced_headers_for_domain(url: str) -> dict[str, str]:
    """Get enhanced headers tailored for specific domains to bypass anti-bot measures."""
    from urllib.parse import urlparse

    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    # Base headers that work for most sites
    base_headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;"
            "q=0.9,image/avif,image/webp,*/*;q=0.8"
        ),
        "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "DNT": "1",
        "Connection": "keep-alive",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
    }

    # Domain-specific optimizations
    if "baidu.com" in domain or "baiducontent.com" in domain:
        # 百度系网站优化
        base_headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
                ),
                "Referer": "https://www.baidu.com/",
                "Origin": "https://www.baidu.com",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9",
            }
        )
    elif "zhihu.com" in domain:
        # 知乎优化
        base_headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Referer": "https://www.zhihu.com/",
                "X-Requested-With": "XMLHttpRequest",
            }
        )
    elif "weibo.com" in domain or "sina.com" in domain:
        # 新浪微博系优化
        base_headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Referer": "https://weibo.com/",
            }
        )
    elif "csdn.net" in domain:
        # CSDN优化
        base_headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Referer": "https://www.csdn.net/",
            }
        )
    elif "github.com" in domain:
        # GitHub优化
        base_headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
        )
    elif "medium.com" in domain:
        # Medium优化
        base_headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                    "Version/16.1 Safari/605.1.15"
                ),
            }
        )
    elif "stackoverflow.com" in domain:
        # Stack Overflow优化
        base_headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Referer": "https://stackoverflow.com/",
            }
        )

    return base_headers


@dataclass
class ProcessingResult:
    """Result of content processing operation."""

    success: bool
    markdown_content: str | None = None
    metadata: dict[str, Any] | None = None
    error_message: str | None = None
    assets_created: list[str] | None = None  # List of R2 paths for created assets


@dataclass
class ProcessingContext:
    """Context for content processing operations."""

    content_item: ContentItem
    session: Session
    user_id: uuid.UUID
    storage_service: Any
    temp_dir: str | None = None


class ProcessingStep(ABC):
    """Abstract base class for processing steps in the pipeline."""

    @abstractmethod
    def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult | Coroutine[Any, Any, ProcessingResult]:
        """Process the content and return updated result (sync or async)."""
        pass

    @abstractmethod
    def can_handle(self, content_type: str) -> bool:
        """Check if this step can handle the given content type."""
        pass


class JinaProcessor(ProcessingStep):
    """Processor using Jina AI for URL content extraction."""

    def __init__(self):
        """Initialize Jina processor."""
        self.api_key = settings.JINA_API_KEY
        self.api_url = "https://r.jina.ai/"

    def can_handle(self, content_type: str) -> bool:
        """Jina can handle URL content when API key is available."""
        return content_type == "url" and bool(self.api_key)

    def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult | Coroutine[Any, Any, ProcessingResult]:
        """Process URL content using Jina AI."""
        if not self.api_key:
            result.success = False
            result.error_message = "Jina API key not configured"
            logger.warning("🔑 Jina API key 未配置，跳过 Jina 处理器")
            return result

        content_item = context.content_item
        logger.info(f"🤖 开始使用 Jina 处理 URL: {content_item.source_uri}")

        try:
            # Prepare request to Jina AI with enhanced headers
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                # Add X-Remove-Selector to remove unwanted elements
                "X-Remove-Selector": "header, nav, footer, .sidebar, .navigation, .breadcrumb, .copyright, .pagination, .menu, .toc, .table-of-contents, .doc-sidebar, .navbar, .header, .footer-wrapper, .site-footer, .site-header, .skip-link, .version-selector, .language-selector, .ads, .advertisement, .social-share, .comments, .related-posts, .recommended, .popup, .modal, .overlay, .banner, .promotion",
            }

            # Use GET request with URL as path parameter (following the curl example pattern)
            full_url = f"{self.api_url}{content_item.source_uri}"
            logger.info(f"📡 发送 Jina API 请求: {full_url}")

            # Make request to Jina AI
            response = requests.get(
                full_url,
                headers=headers,
                timeout=60,  # Jina might take longer than regular requests
            )

            # 详细的状态码和错误分析
            logger.info(f"📊 Jina API 响应状态码: {response.status_code}")

            if response.status_code != 200:
                error_details = self._analyze_jina_error(response)
                result.success = False
                result.error_message = error_details["message"]
                result.metadata = {
                    "processor": "jina",
                    "error_type": error_details["type"],
                    "error_code": response.status_code,
                    "error_details": error_details,
                    "should_retry": error_details["should_retry"],
                    "fallback_recommended": error_details["fallback_recommended"],
                }
                logger.error(f"❌ Jina API 错误: {error_details}")
                return result

            # Jina returns markdown content directly
            # 确保响应编码正确（Jina API通常返回UTF-8，但为了保险起见）
            if response.encoding is None:
                response.encoding = "utf-8"
            markdown_content = response.text

            logger.info(f"📄 Jina 返回内容长度: {len(markdown_content)} 字符")

            # Clean the markdown content to remove problematic characters
            markdown_content = clean_content_for_db(markdown_content)

            # Verify the content is reasonable
            if len(markdown_content) < 50 or len(markdown_content.strip()) == 0:
                result.success = False
                result.error_message = "Jina返回的内容过短或为空，可能是处理失败"
                logger.warning(f"⚠️  Jina 返回内容过短: {len(markdown_content)} 字符")
                return result

            # 检查内容质量
            content_quality = self._assess_content_quality(markdown_content)
            logger.info(f"📊 内容质量评估: {content_quality}")

            if not content_quality["is_valid"]:
                result.success = False
                result.error_message = (
                    f"Jina返回的内容质量不佳: {content_quality['reason']}"
                )
                logger.warning(f"⚠️  Jina 内容质量不佳: {content_quality}")
                return result

            # Extract title from markdown if not set
            if should_update_title(content_item.title):
                lines = markdown_content.split("\n")
                for line in lines:
                    if line.startswith("# "):
                        content_item.title = clean_content_for_db(line[2:].strip())
                        logger.info(
                            f"✅ Jina 从markdown提取到标题: {content_item.title}"
                        )
                        break

                # Fallback to URL hostname if no title found
                if should_update_title(content_item.title):
                    from urllib.parse import urlparse

                    parsed_url = urlparse(content_item.source_uri)
                    hostname = parsed_url.hostname
                    if hostname:
                        # Ensure hostname is a string, not bytes
                        if isinstance(hostname, bytes):
                            hostname = hostname.decode("utf-8", errors="ignore")
                        content_item.title = f"网页内容 - {hostname}"
                    else:
                        content_item.title = "网页内容 - 未知网站"

            logger.info(f"✅ Jina 处理成功，标题: {content_item.title}")
            result.success = True
            result.markdown_content = markdown_content
            result.metadata = {
                "source_url": content_item.source_uri,
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "processor": "jina",
                "content_type": "url",
                "selectors_removed": True,  # 标记已移除不需要的元素
                "jina_api_version": "r.jina.ai",
                "content_quality": content_quality,
                "content_length": len(markdown_content),
            }

            # Store processed markdown to R2
            markdown_path = self._store_markdown_to_r2(
                context, result.markdown_content, result.metadata
            )
            result.assets_created = [markdown_path]

        except requests.exceptions.RequestException as e:
            error_details = self._analyze_request_exception(e)
            result.success = False
            result.error_message = error_details["message"]
            result.metadata = {
                "processor": "jina",
                "error_type": error_details["type"],
                "error_details": error_details,
                "should_retry": error_details["should_retry"],
                "fallback_recommended": True,
            }
            logger.error(f"❌ Jina 网络请求失败: {error_details}")
        except Exception as e:
            result.success = False
            result.error_message = f"Jina processing failed: {str(e)}"
            result.metadata = {
                "processor": "jina",
                "error_type": "unexpected_error",
                "error_details": str(e),
                "should_retry": False,
                "fallback_recommended": True,
            }
            logger.error(f"❌ Jina 处理异常: {str(e)}", exc_info=True)

        return result

    def _analyze_jina_error(self, response) -> dict[str, Any]:
        """分析 Jina API 错误响应"""
        try:
            error_data = response.json()
        except (ValueError, requests.exceptions.JSONDecodeError):
            error_data = {"message": response.text}

        status_code = response.status_code

        if status_code == 402:
            return {
                "type": "insufficient_balance",
                "message": "Jina API 账户余额不足，请前往 https://cloud.jina.ai/ 充值",
                "details": error_data,
                "should_retry": False,
                "fallback_recommended": True,
                "action_required": "recharge_account",
                "recharge_url": "https://cloud.jina.ai/billing",
            }
        elif status_code == 401:
            return {
                "type": "authentication_failed",
                "message": "Jina API 认证失败，请检查 API Key 是否正确",
                "details": error_data,
                "should_retry": False,
                "fallback_recommended": True,
                "action_required": "check_api_key",
            }
        elif status_code == 403:
            return {
                "type": "permission_denied",
                "message": "Jina API 权限不足，可能是 API Key 权限问题",
                "details": error_data,
                "should_retry": False,
                "fallback_recommended": True,
                "action_required": "check_permissions",
            }
        elif status_code == 429:
            return {
                "type": "rate_limited",
                "message": "Jina API 请求频率超限，请稍后重试",
                "details": error_data,
                "should_retry": True,
                "fallback_recommended": False,
                "action_required": "wait_and_retry",
            }
        elif status_code >= 500:
            return {
                "type": "server_error",
                "message": f"Jina API 服务器错误 ({status_code})，请稍后重试",
                "details": error_data,
                "should_retry": True,
                "fallback_recommended": True,
                "action_required": "retry_later",
            }
        else:
            return {
                "type": "unknown_error",
                "message": f"Jina API 未知错误 ({status_code})",
                "details": error_data,
                "should_retry": False,
                "fallback_recommended": True,
                "action_required": "investigate",
            }

    def _analyze_request_exception(self, exception) -> dict[str, Any]:
        """分析请求异常"""
        if isinstance(exception, requests.exceptions.Timeout):
            return {
                "type": "timeout",
                "message": "Jina API 请求超时，请检查网络连接或稍后重试",
                "should_retry": True,
                "action_required": "check_network",
            }
        elif isinstance(exception, requests.exceptions.ConnectionError):
            return {
                "type": "connection_error",
                "message": "无法连接到 Jina API，请检查网络连接",
                "should_retry": True,
                "action_required": "check_network",
            }
        else:
            return {
                "type": "request_error",
                "message": f"Jina API 请求失败: {str(exception)}",
                "should_retry": False,
                "action_required": "investigate",
            }

    def _assess_content_quality(self, content: str) -> dict[str, Any]:
        """评估内容质量"""
        # 检查中文字符比例（对中文网站）
        chinese_chars = len([c for c in content[:2000] if "\u4e00" <= c <= "\u9fff"])

        # 检查是否有明显的错误信息
        error_indicators = [
            "error",
            "404",
            "not found",
            "access denied",
            "forbidden",
            "unauthorized",
            "服务器错误",
            "页面不存在",
        ]

        has_errors = any(
            indicator.lower() in content.lower() for indicator in error_indicators
        )

        # 检查内容结构
        has_headings = any(line.startswith("#") for line in content.split("\n")[:50])
        has_links = "[" in content and "](" in content

        # 基本质量评分
        quality_score = 0
        if len(content) > 200:
            quality_score += 1
        if chinese_chars > 10:  # 对中文内容
            quality_score += 1
        if has_headings:
            quality_score += 1
        if has_links:
            quality_score += 1
        if not has_errors:
            quality_score += 1

        is_valid = quality_score >= 3 and not has_errors

        return {
            "is_valid": is_valid,
            "quality_score": quality_score,
            "chinese_chars": chinese_chars,
            "has_errors": has_errors,
            "has_headings": has_headings,
            "has_links": has_links,
            "content_length": len(content),
            "reason": "低质量内容" if not is_valid else "内容质量良好",
        }

    def _store_markdown_to_r2(
        self,
        context: ProcessingContext,
        markdown_content: str,
        metadata: dict[str, Any],
    ) -> str:
        """Store markdown content to R2 following the organized bucket structure."""
        content_item = context.content_item
        storage_service = context.storage_service

        # Define R2 path based on content type
        r2_path = f"processed/markdown/{content_item.id}.md"

        try:
            # Upload markdown content
            markdown_bytes = markdown_content.encode("utf-8")
            print(f"🔄 正在上传Markdown文件到R2: {r2_path}")
            storage_service.upload_file(
                file_data=BytesIO(markdown_bytes), file_path=r2_path
            )
            print(f"✅ Markdown文件上传成功: {r2_path}")

            # Store metadata as JSON
            metadata_path = f"processed/metadata/{content_item.id}.json"
            metadata_bytes = json.dumps(metadata, indent=2).encode("utf-8")
            print(f"🔄 正在上传元数据文件到R2: {metadata_path}")
            storage_service.upload_file(
                file_data=BytesIO(metadata_bytes), file_path=metadata_path
            )
            print(f"✅ 元数据文件上传成功: {metadata_path}")

            # Create ContentAsset records
            markdown_asset = ContentAsset(
                content_item_id=content_item.id,
                type="processed_text",
                file_path=r2_path,
                s3_bucket=settings.R2_BUCKET,
                s3_key=r2_path,
                mime_type="text/markdown",
                size_bytes=len(markdown_bytes),
                meta_info=json.dumps({"asset_type": "markdown", "processor": "jina"}),
            )

            metadata_asset = ContentAsset(
                content_item_id=content_item.id,
                type="metadata_json",
                file_path=metadata_path,
                s3_bucket=settings.R2_BUCKET,
                s3_key=metadata_path,
                mime_type="application/json",
                size_bytes=len(metadata_bytes),
                meta_info=json.dumps({"asset_type": "metadata", "processor": "jina"}),
            )

            context.session.add(markdown_asset)
            context.session.add(metadata_asset)

            # Store content chunks in database for efficient rendering
            print("🔄 正在创建内容分段...")
            content_chunks = chunk_content_for_item(content_item.id, markdown_content)
            print(f"✅ 创建了 {len(content_chunks)} 个内容分段")

            # Add chunks to session
            for chunk in content_chunks:
                context.session.add(chunk)

            # Store the full markdown content in content_text for backward compatibility
            content_item.content_text = markdown_content
            context.session.add(content_item)

            context.session.commit()
            print("✅ ContentAsset记录和内容分段创建成功")

        except Exception as e:
            print(f"❌ R2存储失败: {str(e)}")
            import traceback

            traceback.print_exc()
            # 不抛出异常，让处理继续进行

        return r2_path


class ReadabilityProcessor(ProcessingStep):
    """使用 BeautifulSoup 提取网页主要内容的处理器"""

    def __init__(self):
        try:
            from bs4 import BeautifulSoup

            self.BeautifulSoup = BeautifulSoup
            self.available = True
        except ImportError:
            self.available = False
            logger.warning("📦 BeautifulSoup 未安装，ReadabilityProcessor 不可用")

    def can_handle(self, content_type: str) -> bool:
        return content_type == "url" and self.available

    def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """使用 BeautifulSoup 处理 URL 内容"""
        if not self.available:
            result.success = False
            result.error_message = "BeautifulSoup processor not available"
            return result

        content_item = context.content_item
        logger.info(f"📖 开始使用 BeautifulSoup 处理 URL: {content_item.source_uri}")

        try:
            # 获取网页内容
            headers = get_enhanced_headers_for_domain(content_item.source_uri)
            response = requests.get(
                content_item.source_uri, headers=headers, timeout=30
            )
            response.raise_for_status()

            # 检查并处理压缩内容
            if not self._is_content_decompressed(response):
                response = self._decompress_response(response)

            # 使用 BeautifulSoup 提取主要内容
            soup = self.BeautifulSoup(response.text, "html.parser")

            # 提取标题
            title_tag = soup.find("title")
            title = title_tag.get_text().strip() if title_tag else ""

            # 移除不需要的元素
            for tag in soup(
                ["script", "style", "nav", "header", "footer", "aside", "form"]
            ):
                tag.decompose()

            # 提取主要内容 - 优先查找常见的内容容器
            main_content = None
            content_selectors = [
                "main",
                "article",
                '[role="main"]',
                ".content",
                ".post-content",
                ".entry-content",
                ".post-body",
                ".article-content",
                "#content",
                ".main-content",
                ".page-content",
            ]

            for selector in content_selectors:
                if selector.startswith(".") or selector.startswith("#"):
                    # CSS选择器
                    elements = soup.select(selector)
                    if elements:
                        main_content = elements[0]
                        break
                else:
                    # 标签选择器
                    main_content = soup.find(selector)
                    if main_content:
                        break

            # 如果没找到主要内容容器，使用body
            if not main_content:
                main_content = soup.find("body") or soup

            # 转换 HTML 到 Markdown
            import html2text

            h = html2text.HTML2Text()
            h.ignore_links = False
            h.ignore_images = False
            h.body_width = 0  # 不限制行宽
            markdown_content = h.handle(str(main_content))

            # 清理内容
            markdown_content = clean_content_for_db(markdown_content)

            if len(markdown_content) < 50:
                result.success = False
                result.error_message = "BeautifulSoup 提取的内容过短"
                return result

            # 设置标题
            if should_update_title(content_item.title) and title:
                content_item.title = clean_content_for_db(title.strip())
                logger.info(f"✅ ReadabilityProcessor 提取到标题: {content_item.title}")

            result.success = True
            result.markdown_content = markdown_content
            result.metadata = {
                "source_url": content_item.source_uri,
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "processor": "beautifulsoup",
                "content_type": "url",
                "extracted_title": title,
                "content_length": len(markdown_content),
                "extraction_method": "beautifulsoup_with_content_detection",
            }

            logger.info(f"✅ BeautifulSoup 处理成功，内容长度: {len(markdown_content)}")

        except Exception as e:
            result.success = False
            result.error_message = f"BeautifulSoup processing failed: {str(e)}"
            logger.error(f"❌ BeautifulSoup 处理失败: {str(e)}")

        return result

    def _is_content_decompressed(self, response) -> bool:
        """检查响应内容是否已正确解压缩"""
        content_encoding = response.headers.get("content-encoding", "").lower()
        if not content_encoding:
            return True

        # 检查内容是否看起来像HTML
        content_start = response.content[:100].lower()
        return b"<html" in content_start or b"<!doctype" in content_start

    def _decompress_response(self, response):
        """手动解压缩响应内容"""
        content_encoding = response.headers.get("content-encoding", "").lower()

        if content_encoding == "gzip":
            import gzip

            response._content = gzip.decompress(response.content)
        elif content_encoding == "deflate":
            import zlib

            response._content = zlib.decompress(response.content)
        elif content_encoding == "br":
            try:
                import brotli

                response._content = brotli.decompress(response.content)
            except ImportError:
                logger.warning("brotli 库未安装，无法解压缩 br 内容")

        return response


class ScrapingBeeProcessor(ProcessingStep):
    """使用 ScrapingBee API 的处理器"""

    def __init__(self):
        self.api_key = getattr(settings, "SCRAPINGBEE_API_KEY", None)
        self.api_url = "https://app.scrapingbee.com/api/v1/"

    def can_handle(self, content_type: str) -> bool:
        return content_type == "url" and bool(self.api_key)

    def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """使用 ScrapingBee 处理 URL 内容"""
        content_item = context.content_item
        logger.info(f"🐝 开始使用 ScrapingBee 处理 URL: {content_item.source_uri}")

        try:
            params = {
                "api_key": self.api_key,
                "url": content_item.source_uri,
                "render_js": "true",  # 渲染 JavaScript
                "premium_proxy": "true",  # 使用高级代理
                "country_code": "cn",  # 使用中国代理
            }

            response = requests.get(self.api_url, params=params, timeout=60)

            if response.status_code == 402:
                result.success = False
                result.error_message = "ScrapingBee API 余额不足"
                result.metadata = {
                    "error_type": "insufficient_balance",
                    "processor": "scrapingbee",
                }
                return result

            response.raise_for_status()

            # 转换 HTML 到 Markdown
            import html2text

            h = html2text.HTML2Text()
            h.ignore_links = False
            h.ignore_images = False
            markdown_content = h.handle(response.text)

            markdown_content = clean_content_for_db(markdown_content)

            result.success = True
            result.markdown_content = markdown_content
            result.metadata = {
                "processor": "scrapingbee",
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "content_length": len(markdown_content),
            }

            logger.info("✅ ScrapingBee 处理成功")

        except Exception as e:
            result.success = False
            result.error_message = f"ScrapingBee processing failed: {str(e)}"
            logger.error(f"❌ ScrapingBee 处理失败: {str(e)}")

        return result


def should_update_title(title: str | None) -> bool:
    """
    Check if a content item's title should be updated.

    Returns True if:
    - Title is None or empty
    - Title is a default placeholder value

    Args:
        title: The current title to check

    Returns:
        bool: True if title should be updated, False otherwise
    """
    if not title:
        return True

    # Check for common default/placeholder titles
    default_titles = {"新内容", "Untitled", "新内容 - 未知网站", "网页内容 - 未知网站"}

    # Check if title is a default placeholder
    if title in default_titles:
        return True

    # Check if title starts with common prefixes that indicate it's a placeholder
    placeholder_prefixes = ["Untitled", "新内容", "网页内容 -"]
    for prefix in placeholder_prefixes:
        if title.startswith(prefix):
            return True

    return False


class FirecrawlProcessor(ProcessingStep):
    """使用 Firecrawl API 的处理器 - 增强版本，支持代理和重试"""

    def __init__(self):
        self.api_key = getattr(settings, "FIRECRAWL_API_KEY", None)
        self.max_retries = getattr(settings, "CONTENT_PROCESSOR_MAX_RETRIES", 3)

    def can_handle(self, content_type: str) -> bool:
        return content_type == "url" and bool(self.api_key)

    def _setup_proxy_environment(self):
        """设置代理环境变量供 firecrawl-py 使用"""
        import os

        # 保存原始环境变量
        self._original_env = {}

        # 检查并设置代理环境变量
        proxy_vars = ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY"]
        for var in proxy_vars:
            if var in os.environ:
                self._original_env[var] = os.environ[var]

        # 如果没有设置代理，但系统有代理配置，则设置
        if not any(var in os.environ for var in proxy_vars):
            # 检查系统代理配置
            system_proxy = os.getenv("all_proxy") or os.getenv("ALL_PROXY")
            if system_proxy and "socks" not in system_proxy.lower():
                os.environ["http_proxy"] = system_proxy
                os.environ["https_proxy"] = system_proxy
                logger.info(f"为 Firecrawl 设置代理: {system_proxy}")

    def _restore_environment(self):
        """恢复原始环境变量"""
        import os

        if hasattr(self, "_original_env"):
            # 恢复原始环境变量
            for var, value in self._original_env.items():
                os.environ[var] = value

    def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """使用 Firecrawl 处理 URL 内容 - 增强版本，支持代理和重试"""
        content_item = context.content_item
        logger.info(f"🔥 使用 Firecrawl 处理: {content_item.source_uri}")

        # 设置代理环境
        self._setup_proxy_environment()

        try:
            # 使用同步 firecrawl-py 库
            from firecrawl import FirecrawlApp

            app = FirecrawlApp(api_key=self.api_key)

            # 配置参数以只保留主要内容
            params = {
                "formats": ["markdown"],
                "onlyMainContent": True,  # 只保留主要内容
                "waitFor": 0,  # 不等待，快速返回
            }

            # 重试机制
            last_error = None
            for attempt in range(self.max_retries):
                try:
                    if attempt > 0:
                        import time

                        delay = min(2**attempt, 10)  # 指数退避，最大10秒
                        logger.info(
                            f"🔄 Firecrawl 重试第 {attempt + 1} 次，等待 {delay} 秒..."
                        )
                        time.sleep(delay)

                    response = app.scrape_url(
                        url=content_item.source_uri, params=params
                    )

                    # 如果成功，跳出重试循环
                    if response and isinstance(response, dict):
                        break

                except Exception as e:
                    last_error = e
                    error_str = str(e)

                    # 检查是否是网络连接问题
                    if any(
                        keyword in error_str.lower()
                        for keyword in [
                            "connection reset",
                            "connection aborted",
                            "connection refused",
                            "timeout",
                            "network",
                            "proxy",
                            "ssl",
                        ]
                    ):
                        logger.warning(
                            f"🔧 Firecrawl 网络错误 (尝试 {attempt + 1}/{self.max_retries}): {error_str}"
                        )
                        if attempt < self.max_retries - 1:
                            continue
                    else:
                        # 非网络错误，直接失败
                        logger.error(f"❌ Firecrawl 非网络错误: {error_str}")
                        break
            else:
                # 所有重试都失败了
                raise last_error if last_error else Exception("所有重试都失败")

            if response and isinstance(response, dict):
                # 提取markdown内容
                markdown_content = ""
                if "markdown" in response:
                    markdown_content = response["markdown"]
                elif "data" in response and isinstance(response["data"], dict):
                    markdown_content = response["data"].get("markdown", "")

                if not markdown_content:
                    result.success = False
                    result.error_message = "Firecrawl 未返回有效的 markdown 内容"
                    result.metadata = {
                        "processor": "firecrawl",
                        "error_type": "empty_content",
                        "should_retry": False,
                        "fallback_recommended": True,
                    }
                    return result

                # 清理内容
                markdown_content = clean_content_for_db(markdown_content)

                # 自动提取标题（简化版）
                if should_update_title(content_item.title):
                    title = None

                    # 优先从metadata提取
                    if "metadata" in response:
                        title = response["metadata"].get("title")
                    elif "data" in response and "metadata" in response["data"]:
                        title = response["data"]["metadata"].get("title")

                    # 回退到markdown标题
                    if not title and markdown_content:
                        for line in markdown_content.split("\n"):
                            if line.startswith("# "):
                                title = line[2:].strip()
                                break

                    if title:
                        content_item.title = clean_content_for_db(title)[:255]
                        logger.info(f"✅ 提取到标题: {content_item.title}")

                # 创建简化的元数据
                metadata = {
                    "processor": "firecrawl",
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                    "content_length": len(markdown_content),
                    "only_main_content": True,
                    "retries_used": attempt,
                }

                # 更新结果
                result.success = True
                result.markdown_content = markdown_content
                result.metadata = metadata

                # 存储并创建分段
                self._store_and_chunk_content(context, markdown_content, metadata)

                logger.info("✅ Firecrawl 处理完成")
            else:
                result.success = False
                result.error_message = "Firecrawl 未返回有效的响应"
                result.metadata = {
                    "processor": "firecrawl",
                    "error_type": "invalid_response",
                    "should_retry": True,
                    "fallback_recommended": True,
                }

        except ImportError:
            result.success = False
            result.error_message = "请安装 firecrawl-py: pip install firecrawl-py"
            result.metadata = {
                "processor": "firecrawl",
                "error_type": "missing_dependency",
                "should_retry": False,
                "fallback_recommended": True,
            }
            logger.error("❌ 缺少 firecrawl-py 依赖")
        except Exception as e:
            error_str = str(e)
            result.success = False

            # 分析错误类型并提供具体建议
            if (
                "connection reset" in error_str.lower()
                or "connection aborted" in error_str.lower()
            ):
                result.error_message = (
                    f"Firecrawl 网络连接被重置，可能是代理或网络配置问题: {error_str}"
                )
                result.metadata = {
                    "processor": "firecrawl",
                    "error_type": "connection_reset",
                    "should_retry": True,
                    "fallback_recommended": True,
                    "suggestions": [
                        "检查网络代理配置",
                        "验证 Firecrawl API 服务状态",
                        "尝试使用其他处理器作为备用方案",
                    ],
                }
            elif "timeout" in error_str.lower():
                result.error_message = f"Firecrawl API 请求超时: {error_str}"
                result.metadata = {
                    "processor": "firecrawl",
                    "error_type": "timeout",
                    "should_retry": True,
                    "fallback_recommended": True,
                }
            elif "proxy" in error_str.lower():
                result.error_message = f"Firecrawl 代理配置问题: {error_str}"
                result.metadata = {
                    "processor": "firecrawl",
                    "error_type": "proxy_error",
                    "should_retry": False,
                    "fallback_recommended": True,
                }
            else:
                result.error_message = f"Firecrawl 处理失败: {error_str}"
                result.metadata = {
                    "processor": "firecrawl",
                    "error_type": "general_error",
                    "should_retry": False,
                    "fallback_recommended": True,
                }

            logger.error(f"❌ Firecrawl 错误: {error_str}")
        finally:
            # 恢复环境变量
            self._restore_environment()

        return result

    def _store_and_chunk_content(
        self,
        context: ProcessingContext,
        markdown_content: str,
        metadata: dict[str, Any],
    ) -> None:
        """存储内容并创建分段 - 简化版本"""
        content_item = context.content_item

        try:
            # 创建内容分段
            content_chunks = chunk_content_for_item(content_item.id, markdown_content)
            for chunk in content_chunks:
                context.session.add(chunk)

            # 保存内容到数据库
            content_item.content_text = markdown_content
            if metadata:
                import json

                content_item.meta_info = json.dumps(metadata)

            context.session.add(content_item)
            context.session.commit()

            logger.info(f"✅ 内容已保存，创建了 {len(content_chunks)} 个分段")

        except Exception as e:
            logger.error(f"❌ 内容存储失败: {e}")
            # 不抛出异常，让主流程继续


class MarkItDownProcessor(ProcessingStep):
    """Core processor using Microsoft MarkItDown for file conversion."""

    def __init__(self, llm_client: Any = None, llm_model: str = "gpt-4o") -> None:
        """Initialize with optional LLM client for image processing."""
        if llm_client:
            self.markitdown = MarkItDown(llm_client=llm_client, llm_model=llm_model)
        else:
            self.markitdown = MarkItDown()

    def can_handle(self, content_type: str) -> bool:
        """MarkItDown can handle most content types."""
        return content_type in [
            "url",
            "pdf",
            "docx",
            "text",
            "xlsx",
            "pptx",
            "image",
            "audio",
        ]

    def process(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult | Coroutine[Any, Any, ProcessingResult]:
        """Process content using MarkItDown."""
        try:
            content_item = context.content_item

            if content_item.type == "url":
                return self._process_url(context, result)
            elif content_item.type == "text":
                return self._process_text(context, result)
            else:
                return self._process_file(context, result)

        except Exception as e:
            result.success = False
            result.error_message = f"MarkItDown processing failed: {str(e)}"
            return result

    def _process_url(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult | Coroutine[Any, Any, ProcessingResult]:
        """Process URL content."""
        content_item = context.content_item

        try:
            # Use MarkItDown to process URL directly
            # For now, we'll fetch the content and process it
            if not content_item.source_uri:
                result.success = False
                result.error_message = "No source URI provided for URL processing"
                return result

            # 检查URL是否为localhost且端口不可访问
            if (
                "localhost" in content_item.source_uri
                or "127.0.0.1" in content_item.source_uri
            ):
                result.success = False
                result.error_message = (
                    "无法访问本地URL，请确保本地服务正在运行或使用公网URL"
                )
                return result

            # 设置代理（如果环境变量中有配置）
            proxies = {}
            if os.getenv("http_proxy"):
                proxies["http"] = os.getenv("http_proxy")
            if os.getenv("https_proxy"):
                proxies["https"] = os.getenv("https_proxy")

            # 获取针对特定域名优化的headers
            headers = get_enhanced_headers_for_domain(content_item.source_uri)

            # 重试机制
            max_retries = 3
            # last_error = None

            for attempt in range(max_retries):
                try:
                    # 添加随机延迟以避免被检测为机器人
                    if attempt > 0:
                        import random
                        import time

                        delay = random.uniform(1, 3)
                        print(f"等待 {delay:.1f} 秒后重试...")
                        time.sleep(delay)

                    response = requests.get(
                        content_item.source_uri,
                        headers=headers,
                        timeout=30,
                        allow_redirects=True,
                        proxies=proxies if proxies else None,
                    )
                    response.raise_for_status()
                    break  # 成功则跳出重试循环

                except requests.exceptions.RequestException as e:
                    # last_error = e
                    if attempt < max_retries - 1:
                        print(
                            f"URL抓取失败，正在重试 ({attempt + 1}/{max_retries}): {str(e)}"
                        )
                        continue
                    else:
                        # 最后一次重试失败
                        error_msg = f"URL处理失败（已重试{max_retries}次）: {str(e)}"
                        if "403" in str(e):
                            error_msg += (
                                " - 可能被网站反爬虫机制拦截，建议尝试其他URL或配置代理"
                            )
                        elif "Connection refused" in str(e):
                            error_msg += " - 连接被拒绝，请检查URL是否正确或网络连接"
                        elif "timeout" in str(e).lower():
                            error_msg += " - 请求超时，请检查网络连接或稍后重试"

                        result.success = False
                        result.error_message = error_msg
                        return result

            # -- 新增：处理非 HTML （如 PDF）文件 --
            content_type_header = response.headers.get("Content-Type", "").lower()
            _, url_ext = os.path.splitext(content_item.source_uri.lower())

            # 更加稳健的 PDF 检测：
            is_pdf = (
                "pdf" in content_type_header
                or url_ext == ".pdf"
                or response.content.startswith(b"%PDF-")
            )
            if is_pdf:
                # 直接将 PDF 内容写入临时文件并使用 MarkItDown 转换
                with tempfile.NamedTemporaryFile(
                    mode="wb", suffix=".pdf", delete=False
                ) as tmp_file:
                    tmp_file.write(response.content)
                    tmp_path = tmp_file.name

                try:
                    markitdown_result = self.markitdown.convert(tmp_path)
                    cleaned_content = clean_content_for_db(
                        markitdown_result.text_content
                    )

                    # 检测乱码内容
                    if is_gibberish(cleaned_content):
                        result.success = False
                        result.error_message = "PDF 解析结果疑似乱码/二进制，已终止保存"
                        return result

                    # 如果转换后仍然过短，视为失败
                    if len(cleaned_content) < 50 or len(cleaned_content.strip()) == 0:
                        result.success = False
                        result.error_message = "PDF 解析失败，内容为空或过短"
                        return result

                    # 更新标题
                    if not content_item.title and markitdown_result.title:
                        content_item.title = clean_content_for_db(
                            markitdown_result.title
                        )

                    result.success = True
                    result.markdown_content = cleaned_content
                    result.metadata = {
                        "source_url": content_item.source_uri,
                        "processed_at": datetime.now(timezone.utc).isoformat(),
                        "processor": "markitdown",
                        "content_type": "pdf",
                        "content_length": len(cleaned_content),
                        "cleaned": True,
                    }

                    # Store processed markdown to R2
                    markdown_path = self._store_markdown_to_r2(
                        context, result.markdown_content, result.metadata
                    )
                    result.assets_created = [markdown_path]

                    return result  # 已成功处理 PDF，直接返回
                finally:
                    # 清理临时文件
                    try:
                        os.unlink(tmp_path)
                    except Exception:
                        pass

            # ---------- 编码检测与解码 ----------
            html_content: str | None = None

            # 1) 先使用 requests 自带的 apparent_encoding 检测
            detected_encoding = response.apparent_encoding

            # 如果 response.encoding 合理且不是 ISO-8859-1/latin-1，则使用它，否则用检测值
            candidate_encoding = (
                response.encoding
                if response.encoding
                and response.encoding.lower()
                not in [
                    "iso-8859-1",
                    "latin-1",
                ]
                else detected_encoding
            )

            # 2) 尝试按候选编码严格解码
            if candidate_encoding:
                try:
                    html_content = response.content.decode(
                        candidate_encoding, errors="strict"
                    )
                    print(f"🔧 使用 {candidate_encoding} 编码成功解码网站内容")
                except UnicodeDecodeError:
                    html_content = None  # 回退到后续步骤

            # 3) 如果仍未成功，使用 charset_normalizer 进一步侦测
            if html_content is None:
                try:
                    from charset_normalizer import (
                        from_bytes,  # 运行时导入避免额外依赖问题
                    )

                    detection_result = from_bytes(response.content).best()
                    if detection_result is not None:
                        html_content = str(detection_result)
                        print(
                            f"🔧 charset_normalizer 侦测编码为 {detection_result.encoding}"
                        )
                except Exception as e:
                    # 如果 charset_normalizer 不可用或失败，忽略并继续
                    print(f"⚠️  charset_normalizer 检测失败: {e}")

            # 4) 多编码暴力尝试
            if html_content is None:
                fallback_encodings = ["utf-8", "gbk", "gb2312", "big5"]
                for enc in fallback_encodings:
                    try:
                        html_content = response.content.decode(enc)
                        print(f"🔧 回退使用 {enc} 编码成功解码网站内容")
                        break
                    except UnicodeDecodeError:
                        continue

            # 5) 仍然失败则使用 "utf-8" 忽略错误
            if html_content is None:
                html_content = response.content.decode("utf-8", errors="ignore")
                print("⚠️  最终使用 UTF-8(ignore) 解码网站内容，可能存在部分字符丢失")

            # Create temporary file for MarkItDown，明确指定UTF-8编码
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".html", delete=False, encoding="utf-8"
            ) as temp_file:
                temp_file.write(html_content)
                temp_path = temp_file.name

            try:
                # Process with MarkItDown
                markitdown_result = self.markitdown.convert(temp_path)

                # Clean the markdown content to remove problematic characters
                cleaned_content = clean_content_for_db(markitdown_result.text_content)

                # Verify the content is reasonable (not mostly binary)
                if len(cleaned_content) < 50 or len(cleaned_content.strip()) == 0:
                    result.success = False
                    result.error_message = "处理后的内容过短或为空，可能是网页解析失败"
                    return result

                # Detect gibberish
                if is_gibberish(cleaned_content):
                    result.success = False
                    result.error_message = "网页解析结果疑似乱码，已终止保存"
                    return result

                # Extract title from URL if not set
                if not content_item.title and markitdown_result.title:
                    content_item.title = clean_content_for_db(markitdown_result.title)

                result.success = True
                result.markdown_content = cleaned_content
                result.metadata = {
                    "source_url": content_item.source_uri,
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                    "processor": "markitdown",
                    "content_type": "url",
                    "content_length": len(cleaned_content),
                    "cleaned": True,
                }

                # Store processed markdown to R2
                markdown_path = self._store_markdown_to_r2(
                    context, result.markdown_content, result.metadata
                )
                result.assets_created = [markdown_path]

            finally:
                # Clean up temp file
                os.unlink(temp_path)

        except Exception as e:
            result.success = False
            result.error_message = f"URL processing failed: {str(e)}"

        return result

    def _process_text(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult | Coroutine[Any, Any, ProcessingResult]:
        """Process plain text content."""
        content_item = context.content_item

        try:
            # For text content, we'll create a simple markdown structure
            markdown_content = self._create_text_markdown(content_item)

            # Clean the markdown content to remove problematic characters
            markdown_content = clean_content_for_db(markdown_content)

            result.success = True
            result.markdown_content = markdown_content
            result.metadata = {
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "processor": "markitdown",
                "content_type": "text",
                "word_count": len(content_item.content_text.split())
                if content_item.content_text
                else 0,
                "content_length": len(markdown_content),
                "cleaned": True,
            }

            # Store processed markdown to R2
            markdown_path = self._store_markdown_to_r2(
                context, result.markdown_content, result.metadata
            )
            result.assets_created = [markdown_path]

        except Exception as e:
            result.success = False
            result.error_message = f"Text processing failed: {str(e)}"

        return result

    def _process_file(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult | Coroutine[Any, Any, ProcessingResult]:
        """Process uploaded file content."""
        # This would be implemented when we have file upload functionality
        # For now, return a placeholder
        result.success = False
        result.error_message = "File processing not yet implemented"
        return result

    def _create_text_markdown(self, content_item: ContentItem) -> str:
        """Create markdown from text content."""
        markdown_parts = []

        # Add title
        if content_item.title:
            markdown_parts.append(f"# {clean_content_for_db(content_item.title)}")
            markdown_parts.append("")

        # Add content
        if content_item.content_text:
            # Clean the content first
            cleaned_text = clean_content_for_db(content_item.content_text)
            # Split into paragraphs and format
            paragraphs = cleaned_text.split("\n\n")
            for paragraph in paragraphs:
                if paragraph.strip():
                    markdown_parts.append(paragraph.strip())
                    markdown_parts.append("")

        # Add metadata section
        markdown_parts.append("## Metadata")
        markdown_parts.append("")
        markdown_parts.append(f"- **Type:** {content_item.type}")
        markdown_parts.append(f"- **Created:** {content_item.created_at.isoformat()}")
        if content_item.source_uri:
            markdown_parts.append(f"- **Source:** {content_item.source_uri}")

        return "\n".join(markdown_parts)

    def _store_markdown_to_r2(
        self,
        context: ProcessingContext,
        markdown_content: str,
        metadata: dict[str, Any],
    ) -> str:
        """Store markdown content to R2 following the organized bucket structure."""
        content_item = context.content_item
        storage_service = context.storage_service

        # Define R2 path based on content type
        if content_item.type == "url":
            # For URLs, store in processed/markdown/
            r2_path = f"processed/markdown/{content_item.id}.md"
        else:
            # For other types, also store in processed/markdown/
            r2_path = f"processed/markdown/{content_item.id}.md"

        try:
            # Upload markdown content
            markdown_bytes = markdown_content.encode("utf-8")
            print(f"🔄 正在上传Markdown文件到R2: {r2_path}")
            storage_service.upload_file(
                file_data=BytesIO(markdown_bytes), file_path=r2_path
            )
            print(f"✅ Markdown文件上传成功: {r2_path}")

            # Store metadata as JSON
            metadata_path = f"processed/metadata/{content_item.id}.json"
            metadata_bytes = json.dumps(metadata, indent=2).encode("utf-8")
            print(f"🔄 正在上传元数据文件到R2: {metadata_path}")
            storage_service.upload_file(
                file_data=BytesIO(metadata_bytes), file_path=metadata_path
            )
            print(f"✅ 元数据文件上传成功: {metadata_path}")

            # Create ContentAsset records
            markdown_asset = ContentAsset(
                content_item_id=content_item.id,
                type="processed_text",
                file_path=r2_path,
                s3_bucket=settings.R2_BUCKET,
                s3_key=r2_path,
                mime_type="text/markdown",
                size_bytes=len(markdown_bytes),
                meta_info=json.dumps(
                    {"asset_type": "markdown", "processor": "markitdown"}
                ),
            )

            metadata_asset = ContentAsset(
                content_item_id=content_item.id,
                type="metadata_json",
                file_path=metadata_path,
                s3_bucket=settings.R2_BUCKET,
                s3_key=metadata_path,
                mime_type="application/json",
                size_bytes=len(metadata_bytes),
                meta_info=json.dumps(
                    {"asset_type": "metadata", "processor": "markitdown"}
                ),
            )

            context.session.add(markdown_asset)
            context.session.add(metadata_asset)

            # Store content chunks in database for efficient rendering
            print("🔄 正在创建内容分段...")
            content_chunks = chunk_content_for_item(content_item.id, markdown_content)
            print(f"✅ 创建了 {len(content_chunks)} 个内容分段")

            # Add chunks to session
            for chunk in content_chunks:
                context.session.add(chunk)

            # Store the full markdown content in content_text for backward compatibility
            content_item.content_text = markdown_content
            context.session.add(content_item)

            context.session.commit()
            print("✅ ContentAsset记录和内容分段创建成功")

        except Exception as e:
            print(f"❌ R2存储失败: {str(e)}")
            import traceback

            traceback.print_exc()
            # 不抛出异常，让处理继续进行

        return r2_path


class ProcessingPipeline:
    """Extensible processing pipeline for content processing."""

    def __init__(self):
        self.steps: list[ProcessingStep] = []
        self.ai_steps: list[ProcessingStep] = []
        self._register_default_steps()

    def _register_default_steps(self):
        """基于简单的CONTENT_PROCESSOR配置注册处理器"""
        # 处理器类映射
        processor_classes = {
            "jina": JinaProcessor,
            "firecrawl": FirecrawlProcessor,
            "scrapingbee": ScrapingBeeProcessor,
            "readability": ReadabilityProcessor,
            "markitdown": MarkItDownProcessor,
        }

        # 获取用户选择的处理器
        preferred_processor = settings.CONTENT_PROCESSOR
        logger.info(f"🎯 用户选择的处理器: {preferred_processor}")

        # 尝试注册首选处理器
        registered = False
        if preferred_processor in processor_classes:
            try:
                processor_instance = processor_classes[preferred_processor]()

                # 检查处理器是否可用
                if self._is_processor_available(
                    preferred_processor, processor_instance
                ):
                    self.add_step(processor_instance)
                    logger.info(f"✅ 成功注册首选处理器: {preferred_processor}")
                    registered = True
                else:
                    logger.warning(
                        f"⚠️  首选处理器 {preferred_processor} 不可用，将使用备用方案"
                    )
            except Exception as e:
                logger.warning(f"⚠️  首选处理器 {preferred_processor} 初始化失败: {e}")

        # 无论如何，都要确保有MarkItDown处理器来处理通用内容
        markitdown_exists = any(
            isinstance(step, MarkItDownProcessor) for step in self.steps
        )
        if not markitdown_exists:
            try:
                logger.info("📝 添加 MarkItDownProcessor 作为通用处理器")
                markitdown_instance = MarkItDownProcessor()
                self.add_step(markitdown_instance)
                logger.info("✅ 成功添加 MarkItDownProcessor")
                if not registered:
                    registered = True
            except Exception as e:
                logger.error(f"❌ 添加 MarkItDownProcessor 失败: {e}")

        # 如果首选处理器不可用，按顺序尝试备用处理器
        if not registered:
            # 调整fallback顺序，markitdown应该优先作为通用处理器
            fallback_order = ["markitdown", "readability"]
            for fallback in fallback_order:
                if fallback != preferred_processor:  # 避免重复尝试
                    try:
                        processor_instance = processor_classes[fallback]()
                        if self._is_processor_available(fallback, processor_instance):
                            self.add_step(processor_instance)
                            logger.info(f"✅ 使用备用处理器: {fallback}")
                            registered = True
                            break
                    except Exception as e:
                        logger.warning(f"⚠️  备用处理器 {fallback} 初始化失败: {e}")

        if not registered:
            logger.error("❌ 没有可用的处理器！")

    def _is_processor_available(self, processor_name: str, processor_instance) -> bool:
        """检查处理器是否可用"""
        # 检查API Key依赖
        if processor_name == "jina" and not settings.JINA_API_KEY:
            logger.info(f"⚠️  {processor_name} 处理器缺少 API Key")
            return False
        elif processor_name == "firecrawl" and not settings.FIRECRAWL_API_KEY:
            logger.info(f"⚠️  {processor_name} 处理器缺少 API Key")
            return False
        elif processor_name == "scrapingbee" and not settings.SCRAPINGBEE_API_KEY:
            logger.info(f"⚠️  {processor_name} 处理器缺少 API Key")
            return False
        elif processor_name == "readability" and not getattr(
            processor_instance, "available", True
        ):
            logger.info(f"⚠️  {processor_name} 处理器缺少依赖库")
            return False

        # markitdown 应该始终可用，除非有严重的问题
        if processor_name == "markitdown":
            return True

        return True

    def add_step(self, step: ProcessingStep):
        """Add a processing step to the pipeline."""
        self.steps.append(step)

    def add_ai_step(self, step: ProcessingStep):
        """Add an AI-enhanced processing step."""
        self.ai_steps.append(step)

    async def process_async(
        self, content_item: ContentItem, session: Session
    ) -> ProcessingResult:
        """Process content item asynchronously using available processors."""
        logger.info(f"Starting async processing for content item {content_item.id}")

        storage_service = get_storage_service()
        context = ProcessingContext(
            content_item=content_item,
            session=session,
            user_id=content_item.user_id,
            storage_service=storage_service,
        )

        # Initialize the result
        result = ProcessingResult(success=False)

        attempted_processors = []

        try:
            # Step 1: Process the content (get markdown)
            for processor in self.steps:
                if processor.can_handle(content_item.type):
                    processor_name = processor.__class__.__name__
                    attempted_processors.append(processor_name)
                    logger.info(f"Attempting to process with {processor_name}")

                    try:
                        processor_result = processor.process(context, result)

                        # Handle async processors
                        if asyncio.iscoroutine(processor_result):
                            processor_result = await processor_result

                        if processor_result.success:
                            result = processor_result
                            logger.info(f"Successfully processed with {processor_name}")
                            break
                        else:
                            logger.warning(
                                f"{processor_name} failed: {processor_result.error_message}"
                            )
                    except Exception as e:
                        logger.error(f"Error with {processor_name}: {str(e)}")
                        result.error_message = (
                            f"Processor {processor_name} failed: {str(e)}"
                        )

            if not result.success:
                # Create comprehensive error message
                error_msg = self._create_comprehensive_error_message(
                    attempted_processors,
                    {
                        "type": "processor_failure",
                        "message": result.error_message or "All processors failed",
                    },
                )
                content_item.processing_status = "failed"
                content_item.error_message = error_msg
                session.add(content_item)
                session.commit()
                return result

            # Step 2: Update content item with processed content
            if result.markdown_content:
                content_item.content_text = clean_content_for_db(
                    result.markdown_content
                )

            if result.metadata:
                content_item.meta_info = json.dumps(result.metadata)

            content_item.processing_status = "completed"
            content_item.error_message = None
            content_item.last_processed_at = datetime.now(timezone.utc)
            session.add(content_item)
            session.commit()

            # 重新获取content_item以确保session绑定，避免refresh错误
            refreshed_content_item = session.get(ContentItem, content_item.id)
            if refreshed_content_item:
                content_item = refreshed_content_item

            logger.info(f"Content processing completed for {content_item.id}")

            # Step 3: 自动创建AI分析对话（新增功能）
            await self._create_auto_analysis_conversation(content_item, session)

            # Step 4: AI Processing (if enabled and content is available)
            if result.success and content_item.content_text and len(self.ai_steps) > 0:
                ai_result = await self._process_ai_steps(context, result)
                if ai_result.metadata:
                    # Merge AI processing metadata
                    if result.metadata:
                        result.metadata.update(ai_result.metadata)
                    else:
                        result.metadata = ai_result.metadata

            return result

        except Exception as e:
            logger.error(f"Critical error in async processing: {str(e)}")
            content_item.processing_status = "failed"
            content_item.error_message = f"Critical processing error: {str(e)}"
            content_item.last_processed_at = datetime.now(timezone.utc)
            session.add(content_item)
            session.commit()

            result.success = False
            result.error_message = str(e)
            return result

    async def _create_auto_analysis_conversation(
        self, content_item: ContentItem, session: Session
    ) -> None:
        """自动为处理完成的内容创建AI分析对话"""
        try:
            # 检查是否已存在自动分析对话
            from sqlmodel import select

            from app.models import AIConversation
            from app.services.ai.chat_service import ChatService

            existing_conversation = session.exec(
                select(AIConversation).where(
                    AIConversation.content_item_id == content_item.id,
                    AIConversation.conversation_type == "auto_analysis",
                    AIConversation.is_active,
                )
            ).first()

            if existing_conversation:
                logger.info(
                    f"Auto analysis conversation already exists for content {content_item.id}"
                )
                return

            # 只有在有内容文本时才创建分析对话
            if (
                not content_item.content_text
                or len(content_item.content_text.strip()) < 100
            ):
                logger.info(
                    f"Content {content_item.id} has insufficient text for analysis"
                )
                return

            # 使用ChatService获取自动分析的正确模型
            # 这里使用通用分析模型作为自动分析的默认模型
            chat_service = ChatService()
            analysis_model = chat_service.get_model_for_template("user_analysis.j2")

            logger.info(
                f"Using model '{analysis_model}' for auto analysis conversation"
            )

            # 创建自动分析对话
            conversation = AIConversation(
                user_id=content_item.user_id,
                content_item_id=content_item.id,
                title=f"自动分析: {content_item.title or '内容分析'}",
                conversation_type="auto_analysis",
                ai_model_name=analysis_model,  # 使用正确的分析模型
                messages="[]",
                summary="内容已准备就绪，可以开始AI分析",
                is_active=True,
            )

            session.add(conversation)
            session.commit()

            # 重新获取conversation以确保session绑定，避免refresh错误
            refreshed_conversation = session.get(AIConversation, conversation.id)
            if refreshed_conversation:
                logger.info(
                    f"Created auto analysis conversation {refreshed_conversation.id} with model {analysis_model} for content {content_item.id}"
                )

        except Exception as e:
            logger.error(f"Failed to create auto analysis conversation: {e}")
            # 不抛出异常，避免影响主要的内容处理流程

    async def _process_ai_steps(
        self, context: ProcessingContext, result: ProcessingResult
    ) -> ProcessingResult:
        """处理AI分析步骤"""
        ai_result = ProcessingResult(success=True)
        ai_result.metadata = {}

        try:
            for ai_step in self.ai_steps:
                if ai_step.can_handle(context.content_item.type):
                    step_result = ai_step.process(context, result)

                    # Handle async AI steps
                    if asyncio.iscoroutine(step_result):
                        step_result = await step_result

                    if step_result.success and step_result.metadata:
                        ai_result.metadata.update(step_result.metadata)
                    else:
                        logger.warning(
                            f"AI step {ai_step.__class__.__name__} failed: {step_result.error_message}"
                        )

        except Exception as e:
            logger.error(f"Error in AI processing steps: {e}")
            ai_result.metadata["ai_processing_error"] = str(e)

        return ai_result

    def process(self, content_item: ContentItem, session: Session) -> ProcessingResult:
        """Process content item synchronously through the pipeline."""

        # Check if we're already in an event loop
        try:
            asyncio.get_running_loop()
            # If we're in an event loop, we need to run in a thread
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run, self.process_async(content_item, session)
                )
                return future.result()
        except RuntimeError:
            # No event loop running, we can use asyncio.run
            return asyncio.run(self.process_async(content_item, session))

    def _get_processing_history(self, attempted_processors: list[str]) -> list[dict]:
        """获取处理历史记录"""
        # 固定的处理器优先级
        processor_priorities = {
            "jina": 1,
            "firecrawl": 2,
            "scrapingbee": 3,
            "readability": 4,
            "markitdown": 5,
        }

        history = []
        for i, processor in enumerate(attempted_processors):
            processor_key = processor.lower().replace("processor", "")
            history.append(
                {
                    "order": i + 1,
                    "processor": processor,
                    "priority": processor_priorities.get(processor_key, 999),
                    "status": "success"
                    if i == len(attempted_processors) - 1
                    else "failed",
                }
            )
        return history

    def _create_comprehensive_error_message(
        self, attempted_processors: list[str], last_error: dict
    ) -> str:
        """创建详细的错误信息"""
        if not attempted_processors:
            return "没有找到可用的处理器"

        if len(attempted_processors) == 1:
            processor = attempted_processors[0]
            if last_error and last_error.get("processor") == processor:
                return f"{processor} 处理失败: {last_error.get('error', '未知错误')}"
            return f"{processor} 处理失败"

        return f"尝试了 {len(attempted_processors)} 个处理器都失败了: {', '.join(attempted_processors)}"

    def _get_failure_recommendations(
        self, attempted_processors: list[str], last_error: dict
    ) -> list[str]:
        """获取失败后的建议"""
        recommendations = []

        # 检查是否有余额不足的问题
        balance_issues = []
        for processor in attempted_processors:
            if "jina" in processor.lower():
                balance_issues.append(
                    "充值 Jina API 账户: https://cloud.jina.ai/billing"
                )
            elif "firecrawl" in processor.lower():
                balance_issues.append("充值 Firecrawl API 账户")
            elif "scrapingbee" in processor.lower():
                balance_issues.append("充值 ScrapingBee API 账户")

        if balance_issues:
            recommendations.extend(balance_issues)

        # 检查是否缺少依赖
        if "ReadabilityProcessor" in attempted_processors:
            recommendations.append(
                "安装 python-readability 库: pip install readability-lxml"
            )

        # 通用建议
        recommendations.extend(
            [
                "检查网络连接",
                "验证目标URL是否可访问",
                "考虑稍后重试",
            ]
        )

        return recommendations

    def get_available_processors(self, content_type: str) -> list[dict]:
        """获取可用处理器信息"""
        # 固定的处理器优先级
        processor_priorities = {
            "jina": 1,
            "firecrawl": 2,
            "scrapingbee": 3,
            "readability": 4,
            "markitdown": 5,
        }

        processors = []
        for step in self.steps:
            if step.can_handle(content_type):
                processor_name = step.__class__.__name__
                processor_key = processor_name.lower().replace("processor", "")

                # 检查处理器状态
                status = "available"
                issues = []

                if processor_key == "jina" and not settings.JINA_API_KEY:
                    status = "unavailable"
                    issues.append("API Key 未配置")
                elif processor_key == "readability" and not getattr(
                    step, "available", True
                ):
                    status = "unavailable"
                    issues.append("依赖库未安装")

                processors.append(
                    {
                        "name": processor_name,
                        "key": processor_key,
                        "priority": processor_priorities.get(processor_key, 999),
                        "status": status,
                        "issues": issues,
                    }
                )

        return sorted(processors, key=lambda x: x["priority"])


# Legacy compatibility - maintain existing factory pattern
class ProcessorBase(ABC):
    """Legacy base class for backward compatibility."""

    @abstractmethod
    def process_content(
        self, content_item: ContentItem, session: Session
    ) -> ProcessingResult:
        """Process content and return result."""
        pass


class ModernProcessor(ProcessorBase):
    """Modern processor that uses the new pipeline system."""

    def __init__(self):
        self.pipeline = ProcessingPipeline()

    def process_content(
        self, content_item: ContentItem, session: Session
    ) -> ProcessingResult:
        """Process content using the modern pipeline."""
        return self.pipeline.process(content_item, session)


class ContentProcessorFactory:
    """Factory for creating content processors."""

    _processors: dict[str, type[ProcessorBase]] = {}
    _modern_processor = ModernProcessor()

    @classmethod
    def register_processor(
        cls, content_type: str, processor_class: type[ProcessorBase]
    ):
        """Register a processor for a content type."""
        cls._processors[content_type] = processor_class

    @classmethod
    def get_processor(cls, content_type: str) -> ProcessorBase:
        """Get processor for content type."""
        # Use modern processor for all types
        return cls._modern_processor


# Register default processors for backward compatibility
ContentProcessorFactory.register_processor("text", ModernProcessor)
ContentProcessorFactory.register_processor("url", ModernProcessor)
ContentProcessorFactory.register_processor("pdf", ModernProcessor)
ContentProcessorFactory.register_processor("docx", ModernProcessor)
ContentProcessorFactory.register_processor("xlsx", ModernProcessor)
ContentProcessorFactory.register_processor("pptx", ModernProcessor)
ContentProcessorFactory.register_processor("image", ModernProcessor)
ContentProcessorFactory.register_processor("audio", ModernProcessor)


# Legacy classes for backward compatibility
class TextProcessor(ProcessorBase):
    """Legacy text processor."""

    def __init__(self):
        self.modern_processor = ModernProcessor()

    def process_content(
        self, content_item: ContentItem, session: Session
    ) -> ProcessingResult:
        return self.modern_processor.process_content(content_item, session)


class URLProcessor(ProcessorBase):
    """Legacy URL processor."""

    def __init__(self):
        self.modern_processor = ModernProcessor()

    def process_content(
        self, content_item: ContentItem, session: Session
    ) -> ProcessingResult:
        return self.modern_processor.process_content(content_item, session)


class ProcessorDiagnostic:
    """处理器诊断工具，用于检测和分析各种处理器的状态"""

    def __init__(self):
        self.pipeline = ProcessingPipeline()

    def diagnose_all(self) -> dict[str, Any]:
        """诊断所有处理器的状态"""
        diagnosis: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "processors": {},
            "summary": {
                "total_processors": 0,
                "available_processors": 0,
                "unavailable_processors": 0,
                "issues_found": [],
            },
        }

        # 诊断各个处理器
        processors_to_check = [
            ("jina", JinaProcessor),
            ("firecrawl", FirecrawlProcessor),
            ("scrapingbee", ScrapingBeeProcessor),
            ("readability", ReadabilityProcessor),
            ("markitdown", MarkItDownProcessor),
        ]

        for name, processor_class in processors_to_check:
            try:
                processor = processor_class()
                result = self._diagnose_processor(name, processor)
                diagnosis["processors"][name] = result

                diagnosis["summary"]["total_processors"] += 1
                if result["status"] == "available":
                    diagnosis["summary"]["available_processors"] += 1
                else:
                    diagnosis["summary"]["unavailable_processors"] += 1
                    issues = result.get("issues", [])
                    if isinstance(issues, list):
                        diagnosis["summary"]["issues_found"].extend(issues)

            except Exception as e:
                diagnosis["processors"][name] = {
                    "status": "error",
                    "error": str(e),
                    "issues": [f"初始化失败: {str(e)}"],
                }
                diagnosis["summary"]["total_processors"] += 1
                diagnosis["summary"]["unavailable_processors"] += 1

        return diagnosis

    def _diagnose_processor(self, name: str, processor) -> dict[str, Any]:
        """诊断单个处理器"""
        result: dict[str, Any] = {
            "name": name,
            "class": processor.__class__.__name__,
            "status": "unknown",
            "can_handle_url": False,
            "issues": [],
            "recommendations": [],
            "config_status": {},
            "test_results": {},
        }

        try:
            # 检查是否能处理URL类型
            result["can_handle_url"] = processor.can_handle("url")

            if name == "jina":
                result.update(self._diagnose_jina(processor))
            elif name == "firecrawl":
                result.update(self._diagnose_firecrawl(processor))
            elif name == "scrapingbee":
                result.update(self._diagnose_scrapingbee(processor))
            elif name == "readability":
                result.update(self._diagnose_readability(processor))
            elif name == "markitdown":
                result.update(self._diagnose_markitdown(processor))

        except Exception as e:
            result["status"] = "error"
            result["issues"].append(f"诊断过程中出错: {str(e)}")

        return result

    def _diagnose_jina(self, processor) -> dict[str, Any]:
        """诊断Jina处理器"""
        result: dict[str, Any] = {
            "config_status": {
                "api_key_configured": bool(processor.api_key),
                "api_key_length": len(processor.api_key) if processor.api_key else 0,
                "api_url": processor.api_url,
            }
        }

        if not processor.api_key:
            result["status"] = "unavailable"
            result["issues"] = ["Jina API Key 未配置"]
            result["recommendations"] = [
                "在环境变量中设置 JINA_API_KEY",
                "获取API Key: https://cloud.jina.ai/",
            ]
        else:
            # 测试API连接
            test_result = self._test_jina_api(processor)
            result["test_results"] = test_result

            if test_result["success"]:
                result["status"] = "available"
            else:
                result["status"] = "unavailable"
                result["issues"] = [test_result["error"]]

                if test_result.get("error_type") == "insufficient_balance":
                    result["recommendations"] = [
                        "充值 Jina API 账户",
                        "充值链接: https://cloud.jina.ai/billing",
                    ]
                elif test_result.get("error_type") == "authentication_failed":
                    result["recommendations"] = [
                        "检查 Jina API Key 是否正确",
                        "重新生成 API Key",
                    ]
                else:
                    result["recommendations"] = ["检查网络连接", "稍后重试"]

        return result

    def _test_jina_api(self, processor) -> dict[str, Any]:
        """测试Jina API连接"""
        try:
            # 使用一个简单的测试URL
            test_url = "https://example.com"
            headers = {
                "Authorization": f"Bearer {processor.api_key}",
                "Content-Type": "application/json",
            }

            full_url = f"{processor.api_url}{test_url}"
            response = requests.get(full_url, headers=headers, timeout=10)

            if response.status_code == 200:
                return {"success": True, "message": "API连接正常"}
            elif response.status_code == 402:
                return {
                    "success": False,
                    "error": "Jina API 账户余额不足",
                    "error_type": "insufficient_balance",
                    "status_code": 402,
                }
            elif response.status_code == 401:
                return {
                    "success": False,
                    "error": "Jina API 认证失败",
                    "error_type": "authentication_failed",
                    "status_code": 401,
                }
            else:
                return {
                    "success": False,
                    "error": f"API返回错误状态码: {response.status_code}",
                    "status_code": response.status_code,
                }

        except requests.exceptions.Timeout:
            return {"success": False, "error": "API请求超时", "error_type": "timeout"}
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": "无法连接到 Jina API",
                "error_type": "connection_error",
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"测试过程中出错: {str(e)}",
                "error_type": "unexpected_error",
            }

    def _diagnose_firecrawl(self, processor) -> dict[str, Any]:
        """诊断Firecrawl处理器"""
        result: dict[str, Any] = {
            "config_status": {
                "api_key_configured": bool(processor.api_key),
                "api_url": processor.api_url,
            }
        }

        if not processor.api_key:
            result["status"] = "unavailable"
            result["issues"] = ["Firecrawl API Key 未配置"]
            result["recommendations"] = [
                "在环境变量中设置 FIRECRAWL_API_KEY",
                "获取API Key: https://firecrawl.dev/",
            ]
        else:
            result["status"] = "available"  # 假设配置正确就可用

        return result

    def _diagnose_scrapingbee(self, processor) -> dict[str, Any]:
        """诊断ScrapingBee处理器"""
        result: dict[str, Any] = {
            "config_status": {
                "api_key_configured": bool(processor.api_key),
                "api_url": processor.api_url,
            }
        }

        if not processor.api_key:
            result["status"] = "unavailable"
            result["issues"] = ["ScrapingBee API Key 未配置"]
            result["recommendations"] = [
                "在环境变量中设置 SCRAPINGBEE_API_KEY",
                "获取API Key: https://www.scrapingbee.com/",
            ]
        else:
            result["status"] = "available"  # 假设配置正确就可用

        return result

    def _diagnose_readability(self, processor) -> dict[str, Any]:
        """诊断BeautifulSoup处理器"""
        result: dict[str, Any] = {
            "config_status": {
                "library_available": getattr(processor, "available", False)
            }
        }

        if not getattr(processor, "available", False):
            result["status"] = "unavailable"
            result["issues"] = ["BeautifulSoup 库未安装"]
            result["recommendations"] = [
                "安装依赖库: pip install beautifulsoup4",
                "或使用: uv add beautifulsoup4",
            ]
        else:
            result["status"] = "available"

        return result

    def _diagnose_markitdown(self, processor) -> dict[str, Any]:
        """诊断MarkItDown处理器"""
        result: dict[str, Any] = {"config_status": {"always_available": True}}

        result["status"] = "available"  # MarkItDown 总是可用的
        return result

    def print_diagnosis_report(self, diagnosis: dict[str, Any] | None = None) -> None:
        """打印诊断报告"""
        if diagnosis is None:
            diagnosis = self.diagnose_all()

        print("=" * 60)
        print("🔍 Nexus 内容处理器诊断报告")
        print("=" * 60)
        print(f"诊断时间: {diagnosis['timestamp']}")
        print(f"总处理器数: {diagnosis['summary']['total_processors']}")
        print(f"可用处理器: {diagnosis['summary']['available_processors']}")
        print(f"不可用处理器: {diagnosis['summary']['unavailable_processors']}")
        print()

        # 按优先级排序显示处理器状态
        priorities = {
            "jina": 1,
            "firecrawl": 2,
            "scrapingbee": 3,
            "readability": 4,
            "markitdown": 5,
        }
        sorted_processors = sorted(
            diagnosis["processors"].items(), key=lambda x: priorities.get(x[0], 999)
        )

        for name, info in sorted_processors:
            status_emoji = (
                "✅"
                if info["status"] == "available"
                else "❌"
                if info["status"] == "unavailable"
                else "⚠️"
            )
            print(f"{status_emoji} {name.upper()} 处理器")
            print(f"   状态: {info['status']}")
            print(f"   优先级: {priorities.get(name, 999)}")

            if info.get("issues"):
                print("   问题:")
                for issue in info["issues"]:
                    print(f"     - {issue}")

            if info.get("recommendations"):
                print("   建议:")
                for rec in info["recommendations"]:
                    print(f"     - {rec}")

            if info.get("test_results"):
                test = info["test_results"]
                if test.get("success"):
                    print(f"   测试结果: ✅ {test.get('message', 'OK')}")
                else:
                    print(f"   测试结果: ❌ {test.get('error', 'Failed')}")

            print()

        # 总结建议
        if diagnosis["summary"]["issues_found"]:
            print("🔧 总体建议:")
            unique_issues = list(set(diagnosis["summary"]["issues_found"]))
            for issue in unique_issues:
                print(f"   - {issue}")
        else:
            print("🎉 所有处理器都工作正常！")

        print("=" * 60)
