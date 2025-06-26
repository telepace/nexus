import asyncio
from collections.abc import AsyncGenerator

from app.schemas.extension import ExtensionStreamChunk, ExtensionStreamRequest


class ExtensionStreamService:
    """扩展流式服务"""

    def __init__(self):
        pass

    def detect_language(self, text: str) -> str:
        """检测文本语言"""
        # 简单的语言检测逻辑
        if not text:
            return "en"

        # 统计中文字符数量
        chinese_chars = sum(1 for char in text if "\u4e00" <= char <= "\u9fff")
        total_chars = len(text.replace(" ", "").replace("\n", ""))

        if total_chars == 0:
            return "en"

        chinese_ratio = chinese_chars / total_chars

        # 如果中文字符比例超过30%，认为是中文
        return "zh" if chinese_ratio > 0.3 else "en"

    async def generate_summary_stream(
        self, request: ExtensionStreamRequest, api_key: str | None = None
    ) -> AsyncGenerator[ExtensionStreamChunk, None]:
        """生成流式摘要（模拟实现）"""

        # 检测语言
        _detected_lang = (
            self.detect_language(request.text)
            if request.lang == "auto"
            else request.lang
        )

        # 模拟流式响应
        summary_parts = [
            "**核心观点**：",
            "本文主要讨论了",
            request.text[:20] + "..." if len(request.text) > 20 else request.text,
            "的相关内容。\n\n",
            "**主要内容**：\n",
            "- 重要信息点1\n",
            "- 重要信息点2\n",
            "- 重要信息点3\n\n",
            "**实用价值**：",
            "该内容具有较高的参考价值。",
        ]

        try:
            for part in summary_parts:
                yield ExtensionStreamChunk(delta=part, done=False)
                await asyncio.sleep(0.1)  # 模拟流式延迟

            # 标记完成
            yield ExtensionStreamChunk(done=True)

        except Exception as e:
            yield ExtensionStreamChunk(error=f"Generation error: {str(e)}", done=True)

    async def generate_keypoints_stream(
        self, request: ExtensionStreamRequest, api_key: str | None = None
    ) -> AsyncGenerator[ExtensionStreamChunk, None]:
        """生成流式要点（模拟实现）"""

        # 检测语言
        _detected_lang = (
            self.detect_language(request.text)
            if request.lang == "auto"
            else request.lang
        )

        # 模拟流式响应
        keypoints_parts = [
            "## 关键要点\n\n",
            "- **要点1**: ",
            "核心概念和重要信息\n",
            "- **要点2**: ",
            "关键数据和统计信息\n",
            "- **要点3**: ",
            "实际应用价值和方法\n",
            "- **要点4**: ",
            "独特见解和创新观点\n",
        ]

        try:
            for part in keypoints_parts:
                yield ExtensionStreamChunk(delta=part, done=False)
                await asyncio.sleep(0.1)  # 模拟流式延迟

            # 标记完成
            yield ExtensionStreamChunk(done=True)

        except Exception as e:
            yield ExtensionStreamChunk(error=f"Generation error: {str(e)}", done=True)
