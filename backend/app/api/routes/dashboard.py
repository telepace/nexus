"""Dashboard API routes for intelligent project routing and metrics."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import and_, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import ContentItem, Project
from app.schemas.common import ApiResponse
from app.schemas.dashboard import SmartRoutingRequest, SmartRoutingResponse
from app.schemas.projects import ProjectCreate, ProjectPublic, ProjectsPublic
from app.services.smart_routing import SmartRoutingService

router = APIRouter()


@router.post("/analyze-query", response_model=ApiResponse[SmartRoutingResponse])
async def analyze_query(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    request: SmartRoutingRequest,
) -> Any:
    """分析用户问题并推荐项目路由"""
    routing_service = SmartRoutingService(session)

    try:
        routing_result = await routing_service.analyze_and_route(
            user_id=current_user.id,
            request=request,
        )

        return ApiResponse(data=routing_result, message="问题分析完成")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.get("/metrics", response_model=ApiResponse[dict[str, Any]])
def get_dashboard_metrics(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """获取 Dashboard 价值指标"""
    # 获取用户项目统计
    projects_count = session.exec(
        select(func.count())
        .select_from(Project)
        .where(and_(Project.owner_id == current_user.id, Project.is_active.is_(True)))
    ).one()

    # 获取内容统计
    content_items_count = session.exec(
        select(func.count())
        .select_from(ContentItem)
        .where(ContentItem.user_id == current_user.id)
    ).one()

    # 获取已完成处理的内容数量
    processed_content_count = session.exec(
        select(func.count())
        .select_from(ContentItem)
        .where(
            and_(
                ContentItem.user_id == current_user.id,
                ContentItem.processing_status == "completed",
            )
        )
    ).one()

    # 获取路由统计
    routing_count = session.exec(
        select(func.count())
        .select_from(ContentItem)
        .where(ContentItem.user_id == current_user.id)
    ).one()

    # 获取最近活跃的项目
    recent_active_projects = session.exec(
        select(Project)
        .where(and_(Project.owner_id == current_user.id, Project.is_active.is_(True)))
        .order_by(Project.updated_at.desc())
        .limit(3)
    ).all()

    metrics = {
        "projects_count": projects_count,
        "content_items_count": content_items_count,
        "processed_content_count": processed_content_count,
        "routing_count": routing_count,
        "growth_indicators": {
            "active_projects": projects_count,
            "processed_documents": processed_content_count,
            "ai_insights": routing_count,  # 用路由数量作为 AI 洞察指标
        },
        "recent_active_projects": [
            {
                "id": str(project.id),
                "title": project.title,
                "updated_at": project.updated_at.isoformat(),
            }
            for project in recent_active_projects
        ],
    }

    return ApiResponse(data=metrics, message="获取指标成功")


@router.get("/activities", response_model=ApiResponse[list[dict[str, Any]]])
async def get_recent_activities(
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = 10,
) -> Any:
    """获取最近的 AI 处理活动流"""
    routing_service = SmartRoutingService(session)

    # 获取路由历史
    routing_history = await routing_service.get_user_routing_history(
        user_id=current_user.id, limit=limit // 2
    )

    # 获取最近的内容处理
    recent_content = session.exec(
        select(ContentItem)
        .where(ContentItem.user_id == current_user.id)
        .order_by(ContentItem.updated_at.desc())
        .limit(limit // 2)
    ).all()

    activities = []

    # 添加路由活动
    for route in routing_history:
        project_name = "未知项目"
        if route["routed_project_id"]:
            project = session.get(Project, uuid.UUID(route["routed_project_id"]))
            if project:
                project_name = project.title

        activities.append(
            {
                "type": "routing",
                "title": f'问题"{route["query_text"][:30]}..."智能路由到"{project_name}"',
                "description": route.get("routing_context", {}).get(
                    "reasoning", "AI 自动路由"
                ),
                "timestamp": route["created_at"],
                "confidence": route.get("confidence_score"),
            }
        )

    # 添加内容处理活动
    for content in recent_content:
        project_name = "未分类"
        if content.project_id:
            project = session.get(Project, content.project_id)
            if project:
                project_name = project.title

        status_map = {
            "completed": "已完成处理",
            "processing": "正在处理",
            "pending": "等待处理",
            "failed": "处理失败",
        }

        activities.append(
            {
                "type": "content_processing",
                "title": f"文档《{content.title or '无标题'}》{status_map.get(content.processing_status, '状态未知')}",
                "description": f'自动归类到"{project_name}"并生成摘要',
                "timestamp": content.updated_at.isoformat(),
                "status": content.processing_status,
            }
        )

    # 按时间排序
    activities.sort(key=lambda x: x["timestamp"], reverse=True)

    return ApiResponse(data=activities[:limit], message="获取活动流成功")


@router.post("/confirm-routing/{route_id}")
async def confirm_routing(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    route_id: uuid.UUID,
    confirmed: bool,
) -> Any:
    """确认或拒绝智能路由建议"""
    routing_service = SmartRoutingService(session)

    success = await routing_service.confirm_routing(
        user_id=current_user.id,
        route_id=route_id,
        confirmed=confirmed,
    )

    if not success:
        raise HTTPException(status_code=404, detail="路由记录未找到")

    return ApiResponse(data={"confirmed": confirmed}, message="路由确认成功")


@router.post("/projects", response_model=ApiResponse[ProjectPublic])
def create_project(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    project_in: ProjectCreate,
) -> Any:
    """创建新项目（基于智能路由建议）"""
    project = Project(
        **project_in.model_dump(),
        owner_id=current_user.id,
    )

    session.add(project)
    session.commit()
    session.refresh(project)

    return ApiResponse(
        data=ProjectPublic.model_validate(project), message="项目创建成功"
    )


@router.get("/projects", response_model=ApiResponse[ProjectsPublic])
def get_user_projects(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
) -> Any:
    """获取用户项目列表"""
    where_conditions = [Project.owner_id == current_user.id]
    if not include_inactive:
        where_conditions.append(Project.is_active.is_(True))

    count_statement = (
        select(func.count()).select_from(Project).where(and_(*where_conditions))
    )
    count = session.exec(count_statement).one()

    statement = (
        select(Project)
        .where(and_(*where_conditions))
        .order_by(Project.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    projects = session.exec(statement).all()

    projects_data = ProjectsPublic(
        data=[ProjectPublic.model_validate(p) for p in projects], count=count
    )

    return ApiResponse(data=projects_data, meta={"skip": skip, "limit": limit})
