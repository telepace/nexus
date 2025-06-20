"""
预处理API路由
提供内容预处理的RESTful API接口
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.dependencies import get_chat_service
from app.services.ai.chat_service import ChatService
from app.services.preprocessing_pipeline import (
    ContentType,
    DocumentMetadata,
    PreprocessingPipeline,
    ProcessingStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/preprocessing", tags=["preprocessing"])


# 请求模型
class PreprocessingRequest(BaseModel):
    """预处理请求模型"""

    content: str = Field(..., min_length=50, description="要预处理的内容")
    metadata: dict[str, Any] = Field(default_factory=dict, description="文档元数据")
    user_preferences: dict[str, Any] | None = Field(None, description="用户偏好设置")

    class Config:
        json_schema_extra = {
            "example": {
                "content": "这是一篇关于人工智能的文章...",
                "metadata": {
                    "title": "人工智能发展趋势",
                    "author": "张三",
                    "source_url": "https://example.com/ai-article",
                    "content_type": "article",
                    "language": "zh",
                },
                "user_preferences": {
                    "summary_style": "detailed",
                    "target_length": 300,
                    "focus_areas": ["技术", "应用"],
                },
            }
        }


class PreprocessingResponse(BaseModel):
    """预处理响应模型"""

    success: bool
    message: str
    data: dict[str, Any] | None = None
    error_details: list[str] | None = None


# 批量预处理请求
class BatchPreprocessingRequest(BaseModel):
    """批量预处理请求模型"""

    items: list[PreprocessingRequest] = Field(
        ..., max_items=10, description="批量处理项目"
    )
    parallel_processing: bool = Field(True, description="是否并行处理")


@router.post("/process", response_model=PreprocessingResponse)
async def process_content(
    request: PreprocessingRequest, chat_service: ChatService = Depends(get_chat_service)
):
    """
    处理单个内容

    执行完整的6层预处理流水线：
    1. 输入层：内容验证和规范化
    2. 解析层：转换为统一Markdown格式
    3. 智能分段层：长文本分段处理
    4. AI初始化层：生成摘要、要点等
    5. 存储层：持久化数据
    6. 输出层：格式化结果
    """
    try:
        logger.info("开始处理内容预处理请求")

        # 创建预处理管线
        pipeline = PreprocessingPipeline(chat_service)

        # 构建文档元数据
        metadata = _build_document_metadata(request.metadata)

        # 执行预处理
        result = await pipeline.process_content(
            content=request.content,
            metadata=metadata,
            user_preferences=request.user_preferences,
        )

        # 构建响应
        if result.status == ProcessingStatus.COMPLETED:
            return PreprocessingResponse(
                success=True,
                message="内容预处理完成",
                data={
                    "content_id": result.content_id,
                    "status": result.status.value,
                    "processed_at": result.processed_at.isoformat(),
                    "markdown_content": result.markdown_content,
                    "segments_count": len(result.segments),
                    "summary": result.summary,
                    "key_points": result.key_points,
                    "labels": result.labels,
                    "reading_time_minutes": result.reading_time_minutes,
                    "difficulty_level": result.difficulty_level,
                    "content_quality_score": result.content_quality_score,
                    "processing_stats": result.processing_stats,
                },
            )
        elif result.status == ProcessingStatus.PARTIAL_SUCCESS:
            return PreprocessingResponse(
                success=True,
                message="内容预处理部分完成",
                data={
                    "content_id": result.content_id,
                    "status": result.status.value,
                    "processed_at": result.processed_at.isoformat(),
                    "markdown_content": result.markdown_content,
                    "segments_count": len(result.segments),
                    "summary": result.summary,
                    "key_points": result.key_points,
                    "labels": result.labels,
                    "reading_time_minutes": result.reading_time_minutes,
                    "difficulty_level": result.difficulty_level,
                    "content_quality_score": result.content_quality_score,
                    "processing_stats": result.processing_stats,
                },
                error_details=result.errors,
            )
        else:
            return PreprocessingResponse(
                success=False, message="内容预处理失败", error_details=result.errors
            )

    except ValueError as e:
        logger.warning(f"请求参数错误: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        logger.error(f"预处理过程发生错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="内部服务器错误"
        )


@router.post("/batch-process", response_model=PreprocessingResponse)
async def batch_process_content(
    request: BatchPreprocessingRequest,
    chat_service: ChatService = Depends(get_chat_service),
):
    """
    批量处理内容

    支持并行或串行处理多个内容项目
    """
    try:
        if len(request.items) == 0:
            raise ValueError("批量处理列表不能为空")

        if len(request.items) > 10:
            raise ValueError("单次批量处理不能超过10个项目")

        logger.info(f"开始批量处理 {len(request.items)} 个内容")

        # 创建预处理管线
        pipeline = PreprocessingPipeline(chat_service)

        results = []

        if request.parallel_processing:
            # 并行处理
            import asyncio

            tasks = []
            for item in request.items:
                metadata = _build_document_metadata(item.metadata)
                task = pipeline.process_content(
                    content=item.content,
                    metadata=metadata,
                    user_preferences=item.user_preferences,
                )
                tasks.append(task)

            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for i, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    results.append({"index": i, "success": False, "error": str(result)})
                elif (
                    hasattr(result, "content_id")
                    and hasattr(result, "status")
                    and hasattr(result, "summary")
                ):
                    # 确保是 PreprocessingResult
                    results.append(
                        {
                            "index": i,
                            "success": True,
                            "content_id": result.content_id,
                            "status": result.status.value,
                            "summary": result.summary,
                        }
                    )
                else:
                    results.append(
                        {"index": i, "success": False, "error": "未知处理结果"}
                    )
        else:
            # 串行处理
            for i, item in enumerate(request.items):
                try:
                    metadata = _build_document_metadata(item.metadata)
                    result = await pipeline.process_content(
                        content=item.content,
                        metadata=metadata,
                        user_preferences=item.user_preferences,
                    )

                    results.append(
                        {
                            "index": i,
                            "success": True,
                            "content_id": result.content_id,
                            "status": result.status.value,
                            "summary": result.summary,
                        }
                    )

                except Exception as e:
                    logger.error(f"批量处理第{i}个项目失败: {str(e)}")
                    results.append({"index": i, "success": False, "error": str(e)})

        # 统计结果
        success_count = sum(1 for r in results if r["success"])

        return PreprocessingResponse(
            success=success_count > 0,
            message=f"批量处理完成：成功 {success_count}/{len(request.items)} 个",
            data={
                "total_items": len(request.items),
                "success_count": success_count,
                "failed_count": len(request.items) - success_count,
                "results": results,
            },
        )

    except ValueError as e:
        logger.warning(f"批量处理请求参数错误: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except Exception as e:
        logger.error(f"批量处理过程发生错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="内部服务器错误"
        )


@router.get("/status/{content_id}")
async def get_processing_status(content_id: str):
    """
    获取处理状态

    查询特定内容的预处理状态
    """
    try:
        # 这里应该从数据库查询实际状态
        # 目前返回模拟数据

        return PreprocessingResponse(
            success=True,
            message="状态查询成功",
            data={
                "content_id": content_id,
                "status": "completed",
                "processed_at": "2024-01-01T00:00:00Z",
                "processing_time": 15.5,
            },
        )

    except Exception as e:
        logger.error(f"查询处理状态失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败"
        )


@router.get("/content/{content_id}/segments")
async def get_content_segments(content_id: str):
    """
    获取内容分段

    返回特定内容的所有分段信息
    """
    try:
        # 这里应该从数据库查询实际分段数据
        # 目前返回模拟数据

        mock_segments = [
            {
                "id": "segment_1",
                "order": 1,
                "content": "第一段内容...",
                "summary": "第一段摘要",
                "word_count": 150,
                "type": "paragraph",
            },
            {
                "id": "segment_2",
                "order": 2,
                "content": "第二段内容...",
                "summary": "第二段摘要",
                "word_count": 200,
                "type": "paragraph",
            },
        ]

        return PreprocessingResponse(
            success=True,
            message="分段信息获取成功",
            data={
                "content_id": content_id,
                "total_segments": len(mock_segments),
                "segments": mock_segments,
            },
        )

    except Exception as e:
        logger.error(f"获取内容分段失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="获取失败"
        )


@router.post("/validate")
async def validate_content(request: dict[str, Any]):
    """
    验证内容格式

    在正式处理前验证内容是否符合要求
    """
    try:
        content = request.get("content", "")

        if not content:
            return PreprocessingResponse(success=False, message="内容不能为空")

        if len(content) < 50:
            return PreprocessingResponse(
                success=False, message="内容太短，至少需要50个字符"
            )

        if len(content) > 500000:  # 500KB
            return PreprocessingResponse(
                success=False, message="内容太长，不能超过500KB"
            )

        # 简单的内容质量检查
        word_count = len(content.split())
        char_count = len(content)

        return PreprocessingResponse(
            success=True,
            message="内容验证通过",
            data={
                "word_count": word_count,
                "char_count": char_count,
                "estimated_processing_time": max(5, word_count // 100),  # 秒
                "recommended_segmentation": word_count > 1000,
            },
        )

    except Exception as e:
        logger.error(f"内容验证失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="验证失败"
        )


def _build_document_metadata(metadata_dict: dict[str, Any]) -> DocumentMetadata:
    """构建文档元数据对象"""
    content_type_str = metadata_dict.get("content_type", "document")

    # 转换内容类型
    try:
        content_type = ContentType(content_type_str)
    except ValueError:
        content_type = ContentType.DOCUMENT

    return DocumentMetadata(
        title=metadata_dict.get("title"),
        author=metadata_dict.get("author"),
        source_url=metadata_dict.get("source_url"),
        publication_date=metadata_dict.get("publication_date"),
        content_type=content_type,
        language=metadata_dict.get("language", "en"),
        domain=metadata_dict.get("domain"),
        estimated_words=metadata_dict.get("estimated_words", 0),
    )
