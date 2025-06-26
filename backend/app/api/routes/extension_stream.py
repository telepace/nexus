import json
import uuid
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user
from app.models import User
from app.schemas.extension import ExtensionStreamChunk, ExtensionStreamRequest
from app.services.extension_stream import ExtensionStreamService

router = APIRouter()

# 初始化服务
extension_service = ExtensionStreamService()


async def _format_sse_stream(
    stream_generator: AsyncGenerator[ExtensionStreamChunk, None],
    _source: str,
    _request_id: str,
) -> AsyncGenerator[str, None]:
    """格式化为SSE流"""
    try:
        async for chunk in stream_generator:
            # 格式化为SSE格式
            data = chunk.model_dump()
            yield f"data: {json.dumps(data)}\n\n"
    except Exception as e:
        # 发送错误信息
        error_chunk = ExtensionStreamChunk(error=str(e), done=True)
        yield f"data: {json.dumps(error_chunk.model_dump())}\n\n"


@router.post(
    "/summary/stream",
    summary="获取流式摘要",
    description="为浏览器插件提供流式摘要生成服务",
)
async def get_summary_stream(
    request: ExtensionStreamRequest, _current_user: User = Depends(get_current_user)
) -> StreamingResponse:
    """
    生成流式摘要

    - **text**: 需要摘要的文本内容（必填，1-50000字符）
    - **lang**: 语言设置（auto/zh/en，默认auto自动检测）
    - **max_tokens**: 最大生成token数（50-4096，默认1024）

    返回Server-Sent Events格式的流式数据
    """

    # 生成请求ID
    request_id = str(uuid.uuid4())

    try:
        # 生成流式摘要
        stream_generator = extension_service.generate_summary_stream(
            request=request,
            api_key=None,  # 使用系统默认API key
        )

        # 格式化为SSE流
        sse_stream = _format_sse_stream(stream_generator, "summary", request_id)

        return StreamingResponse(
            sse_stream,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Content-Source": "summary",
                "X-Request-ID": request_id,
            },
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}",
        )


@router.post(
    "/keypoints/stream",
    summary="获取流式要点",
    description="为浏览器插件提供流式要点提取服务",
)
async def get_keypoints_stream(
    request: ExtensionStreamRequest, _current_user: User = Depends(get_current_user)
) -> StreamingResponse:
    """
    生成流式要点

    - **text**: 需要提取要点的文本内容（必填，1-50000字符）
    - **lang**: 语言设置（auto/zh/en，默认auto自动检测）
    - **max_tokens**: 最大生成token数（50-4096，默认1024）

    返回Server-Sent Events格式的流式数据
    """

    # 生成请求ID
    request_id = str(uuid.uuid4())

    try:
        # 生成流式要点
        stream_generator = extension_service.generate_keypoints_stream(
            request=request,
            api_key=None,  # 使用系统默认API key
        )

        # 格式化为SSE流
        sse_stream = _format_sse_stream(stream_generator, "keypoints", request_id)

        return StreamingResponse(
            sse_stream,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Content-Source": "keypoints",
                "X-Request-ID": request_id,
            },
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate keypoints: {str(e)}",
        )


@router.post(
    "/analyze",
    summary="并行获取摘要和要点",
    description="同时生成摘要和要点，为插件优化的批量接口",
)
async def analyze_content(
    request: ExtensionStreamRequest, _current_user: User = Depends(get_current_user)
) -> StreamingResponse:
    """
    并行生成摘要和要点的优化接口

    返回包含两种类型内容的组合流，客户端可根据 source 字段区分内容类型
    """

    request_id = str(uuid.uuid4())

    async def combined_stream() -> AsyncGenerator[str, None]:
        """组合流生成器"""
        try:
            # 并行启动两个生成器
            summary_gen = extension_service.generate_summary_stream(request)
            keypoints_gen = extension_service.generate_keypoints_stream(request)

            # 交替发送数据
            summary_done = False
            keypoints_done = False

            while not (summary_done and keypoints_done):
                if not summary_done:
                    try:
                        summary_chunk = await summary_gen.__anext__()
                        data = summary_chunk.model_dump()
                        data["source"] = "summary"
                        yield f"data: {json.dumps(data)}\n\n"
                        if summary_chunk.done:
                            summary_done = True
                    except StopAsyncIteration:
                        summary_done = True

                if not keypoints_done:
                    try:
                        keypoints_chunk = await keypoints_gen.__anext__()
                        data = keypoints_chunk.model_dump()
                        data["source"] = "keypoints"
                        yield f"data: {json.dumps(data)}\n\n"
                        if keypoints_chunk.done:
                            keypoints_done = True
                    except StopAsyncIteration:
                        keypoints_done = True

        except Exception as e:
            error_chunk = ExtensionStreamChunk(error=str(e), done=True)
            error_data = error_chunk.model_dump()
            error_data["source"] = "error"
            yield f"data: {json.dumps(error_data)}\n\n"

    try:
        return StreamingResponse(
            combined_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Content-Source": "combined",
                "X-Request-ID": request_id,
            },
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze content: {str(e)}",
        )
