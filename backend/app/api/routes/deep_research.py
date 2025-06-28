"""
Deep Research API 路由
提供深度研究任务的RESTful API接口
"""

import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from app.api.deps import CurrentUser, SessionDep
from app.models import DeepResearchJob
from app.schemas.deep_research import (
    DeepResearchJobCreate,
    DeepResearchJobPublic,
    DeepResearchJobResponse,
    DeepResearchJobResult,
)
from app.services.deep_research_service import deep_research_service
from app.utils.timezone import now_utc

logger = logging.getLogger(__name__)

router = APIRouter(tags=["deep-research"])


@router.post(
    "/create",
    response_model=DeepResearchJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建深度研究任务",
    description="创建一个新的深度研究任务，使用GPT Researcher进行深度研究分析",
)
async def create_deep_research_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_request: DeepResearchJobCreate,
    background_tasks: BackgroundTasks,
) -> DeepResearchJobResponse:
    """
    创建深度研究任务

    - 接收研究查询和配置参数
    - 创建任务记录
    - 启动后台处理
    - 返回任务ID供查询状态
    """
    try:
        # 创建深度研究任务记录
        job = DeepResearchJob(
            user_id=current_user.id,
            query=job_request.query,
            depth=job_request.depth,
            breadth=job_request.breadth,
            status="pending",
            created_at=now_utc(),
            updated_at=now_utc(),
        )

        session.add(job)
        session.commit()
        session.refresh(job)

        # 启动后台任务
        background_tasks.add_task(deep_research_service.process_deep_research, job.id)

        logger.info(f"创建深度研究任务: {job.id}, 查询: {job_request.query}")

        return DeepResearchJobResponse(
            job_id=job.id,
            status="pending",
            message="深度研究任务已创建，正在队列中等待处理",
        )

    except Exception as e:
        logger.error(f"创建深度研究任务失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建深度研究任务失败",
        )


@router.get(
    "/jobs/{job_id}",
    response_model=DeepResearchJobPublic,
    summary="获取深度研究任务信息",
    description="获取指定深度研究任务的详细信息",
)
async def get_deep_research_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: uuid.UUID,
) -> DeepResearchJobPublic:
    """获取深度研究任务的基本信息"""
    job = session.get(DeepResearchJob, job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="深度研究任务不存在",
        )

    # 检查权限 - 只能访问自己的任务
    if job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此深度研究任务",
        )

    return DeepResearchJobPublic.model_validate(job)


@router.get(
    "/jobs/{job_id}/result",
    response_model=DeepResearchJobResult,
    summary="获取深度研究任务结果",
    description="获取深度研究任务的完整结果，包括markdown内容和AI分析结果",
)
async def get_deep_research_result(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: uuid.UUID,
) -> DeepResearchJobResult:
    """获取深度研究任务的完整结果"""
    # 首先验证任务存在和权限
    job = session.get(DeepResearchJob, job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="深度研究任务不存在",
        )

    if job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此深度研究任务",
        )

    # 获取任务结果
    try:
        result = await deep_research_service.get_job_result(job_id)

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="获取任务结果失败",
            )

        return DeepResearchJobResult(**result)

    except Exception as e:
        logger.error(f"获取深度研究结果失败: {job_id}, 错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取深度研究结果失败",
        )


@router.get(
    "/jobs",
    response_model=list[DeepResearchJobPublic],
    summary="获取用户的深度研究任务列表",
    description="获取当前用户的所有深度研究任务",
)
async def list_deep_research_jobs(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> list[DeepResearchJobPublic]:
    """获取用户的深度研究任务列表"""
    from sqlmodel import select

    # 查询当前用户的任务
    statement = (
        select(DeepResearchJob)
        .where(DeepResearchJob.user_id == current_user.id)
        .order_by(DeepResearchJob.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    jobs = session.exec(statement).all()

    return [DeepResearchJobPublic.model_validate(job) for job in jobs]


@router.delete(
    "/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除深度研究任务",
    description="删除指定的深度研究任务及其结果文件",
)
async def delete_deep_research_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    job_id: uuid.UUID,
) -> None:
    """删除深度研究任务"""
    job = session.get(DeepResearchJob, job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="深度研究任务不存在",
        )

    if job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权删除此深度研究任务",
        )

    try:
        # 删除markdown文件（如果存在）
        if job.markdown_path:
            from pathlib import Path

            try:
                file_path = Path("static") / job.markdown_path
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"删除研究结果文件: {file_path}")
            except Exception as e:
                logger.warning(f"删除结果文件失败: {e}")

        # 删除数据库记录
        session.delete(job)
        session.commit()

        logger.info(f"删除深度研究任务: {job_id}")

    except Exception as e:
        logger.error(f"删除深度研究任务失败: {job_id}, 错误: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除深度研究任务失败",
        )
