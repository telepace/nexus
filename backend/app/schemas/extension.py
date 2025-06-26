from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ExtensionStreamRequest(BaseModel):
    """扩展流式请求模型"""

    text: str = Field(
        ..., min_length=1, max_length=50000, description="需要处理的文本内容"
    )
    lang: Literal["auto", "zh", "en"] = Field(
        default="auto", description="内容语言，auto为自动检测"
    )
    max_tokens: int | None = Field(
        default=1024, ge=50, le=4096, description="最大生成token数"
    )

    @field_validator("text")
    @classmethod
    def validate_text(cls, v):
        if not v or not v.strip():
            raise ValueError("文本内容不能为空")
        return v.strip()


class ExtensionStreamChunk(BaseModel):
    """流式响应数据块模型"""

    delta: str | None = Field(None, description="增量文本内容")
    done: bool = Field(default=False, description="是否完成")
    error: str | None = Field(None, description="错误信息")


class ExtensionSummaryResponse(BaseModel):
    """摘要响应模型（非流式）"""

    summary: str = Field(..., description="生成的摘要")
    lang: str = Field(..., description="检测到的语言")
    tokens_used: int = Field(..., description="使用的token数量")


class ExtensionKeyPointsResponse(BaseModel):
    """要点响应模型（非流式）"""

    key_points: str = Field(..., description="生成的要点")
    lang: str = Field(..., description="检测到的语言")
    tokens_used: int = Field(..., description="使用的token数量")


class ExtensionStreamMetadata(BaseModel):
    """流式响应元数据"""

    source: Literal["summary", "keypoints"] = Field(..., description="内容来源类型")
    start_time: float = Field(..., description="开始时间戳")
    request_id: str = Field(..., description="请求ID")
