import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_active_user
from app.models import User
from app.utils.content_processors import ProcessorDiagnostic

# 创建logger实例
logger = logging.getLogger(__name__)

# 创建路由器
router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/processors/status")
async def get_processors_status(
    current_user: User = Depends(get_current_active_user),
):
    """获取所有内容处理器的状态"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Only superusers can access processor status"
        )

    try:
        diagnostic = ProcessorDiagnostic()
        diagnosis = diagnostic.diagnose_all()
        return diagnosis
    except Exception as e:
        logger.error(f"Failed to get processor status: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get processor status: {str(e)}"
        )


@router.get("/processors/{processor_name}/test")
async def test_processor(
    processor_name: str,
    current_user: User = Depends(get_current_active_user),
):
    """测试特定处理器"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Only superusers can test processors"
        )

    try:
        diagnostic = ProcessorDiagnostic()

        # 支持的处理器列表
        supported_processors = {
            "jina": ("jina", diagnostic._diagnose_jina),
            "firecrawl": ("firecrawl", diagnostic._diagnose_firecrawl),
            "scrapingbee": ("scrapingbee", diagnostic._diagnose_scrapingbee),
            "readability": ("readability", diagnostic._diagnose_readability),
            "markitdown": ("markitdown", diagnostic._diagnose_markitdown),
        }

        if processor_name not in supported_processors:
            raise HTTPException(
                status_code=404,
                detail=f"Processor '{processor_name}' not found. Supported processors: {list(supported_processors.keys())}",
            )

        # 创建处理器实例并测试
        processor_class_map = {
            "jina": lambda: __import__(
                "app.utils.content_processors", fromlist=["JinaProcessor"]
            ).JinaProcessor(),
            "firecrawl": lambda: __import__(
                "app.utils.content_processors", fromlist=["FirecrawlProcessor"]
            ).FirecrawlProcessor(),
            "scrapingbee": lambda: __import__(
                "app.utils.content_processors", fromlist=["ScrapingBeeProcessor"]
            ).ScrapingBeeProcessor(),
            "readability": lambda: __import__(
                "app.utils.content_processors", fromlist=["ReadabilityProcessor"]
            ).ReadabilityProcessor(),
            "markitdown": lambda: __import__(
                "app.utils.content_processors", fromlist=["MarkItDownProcessor"]
            ).MarkItDownProcessor(),
        }

        processor = processor_class_map[processor_name]()
        test_func = supported_processors[processor_name][1]

        result = test_func(processor)
        result["tested_at"] = datetime.utcnow().isoformat()

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to test processor {processor_name}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to test processor: {str(e)}"
        )


@router.post("/processors/reorder")
async def reorder_processors(
    processor_order: list[str],
    current_user: User = Depends(get_current_active_user),
):
    """重新排序处理器优先级"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Only superusers can reorder processors"
        )

    # 这里可以实现动态调整处理器优先级的逻辑
    # 目前作为演示，返回当前设置
    return {
        "message": "Processor order updated",
        "new_order": processor_order,
        "note": "This is a demo endpoint. Actual implementation would update processor priorities.",
    }
