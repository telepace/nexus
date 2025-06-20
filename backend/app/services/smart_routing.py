"""智能路由服务 - 分析用户问题并推荐合适的项目"""

import json
import logging
import uuid
from typing import Any

from sqlmodel import Session, and_, select

from app.core.config import settings
from app.models.project import Project, QueryRoute
from app.models.prompt import Tag
from app.schemas.dashboard import SmartRoutingRequest, SmartRoutingResponse
from app.utils.llm import get_llm_client

logger = logging.getLogger(__name__)


class SmartRoutingService:
    """智能路由服务"""

    def __init__(self, session: Session):
        self.session = session
        self.llm_client = get_llm_client()

    async def analyze_and_route(
        self,
        user_id: uuid.UUID,
        request: SmartRoutingRequest,
    ) -> SmartRoutingResponse:
        """分析用户问题并推荐路由"""

        # 1. 获取用户现有项目
        user_projects = await self._get_user_projects(user_id)

        # 2. 获取相关标签
        relevant_tags = await self._get_relevant_tags(request.query_text)

        # 3. 使用 LLM 分析问题并推荐项目
        routing_result = await self._llm_analyze_query(
            query_text=request.query_text,
            user_projects=user_projects,
            relevant_tags=relevant_tags,
            context=request.context or {},
        )

        # 4. 记录路由结果
        await self._record_routing_result(
            user_id=user_id,
            query_text=request.query_text,
            routing_result=routing_result,
        )

        return routing_result

    async def _get_user_projects(self, user_id: uuid.UUID) -> list[dict[str, Any]]:
        """获取用户的活跃项目"""

        statement = (
            select(Project)
            .where(and_(Project.owner_id == user_id, Project.is_active.is_(True)))
            .order_by(Project.updated_at.desc())
            .limit(10)  # 只考虑最近的10个项目
        )

        projects = self.session.exec(statement).all()

        return [
            {
                "id": str(project.id),
                "title": project.title,
                "description": project.description,
                "project_type": project.project_type,
                "ai_context": project.ai_context,
                "updated_at": project.updated_at.isoformat(),
            }
            for project in projects
        ]

    async def _get_relevant_tags(self, query_text: str) -> list[dict[str, Any]]:
        """获取与查询相关的标签"""

        # 简化版本：获取最常用的标签
        # 在实际实现中，可以使用向量搜索或其他语义匹配方法
        statement = select(Tag).order_by(Tag.created_at.desc()).limit(20)

        tags = self.session.exec(statement).all()

        return [
            {
                "id": str(tag.id),
                "name": tag.name,
                "description": tag.description,
            }
            for tag in tags
        ]

    async def _llm_analyze_query(
        self,
        query_text: str,
        user_projects: list[dict[str, Any]],
        relevant_tags: list[dict[str, Any]],
        context: dict[str, Any],
    ) -> SmartRoutingResponse:
        """使用 LLM 分析查询并推荐项目"""

        # 构造提示词
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(
            query_text=query_text,
            user_projects=user_projects,
            relevant_tags=relevant_tags,
            context=context,
        )

        try:
            # 调用 LLM
            response = await self.llm_client.chat.completions.create(
                model=settings.DEFAULT_LLM_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=1000,
            )

            # 解析 LLM 响应
            llm_response = response.choices[0].message.content
            return self._parse_llm_response(llm_response, user_projects)

        except Exception as e:
            logger.error(f"LLM 分析失败: {e}")
            # 返回默认响应
            return SmartRoutingResponse(
                confidence_score=0.0,
                reasoning="AI 分析服务暂时不可用，建议创建新项目",
                should_create_new=True,
                suggested_project_name=self._extract_topic_from_query(query_text),
            )

    def _build_system_prompt(self) -> str:
        """构造系统提示词"""
        return """你是一个智能项目路由助手。你的任务是分析用户的问题，并推荐最合适的现有项目，或建议创建新项目。

分析原则：
1. 仔细理解用户问题的主题和意图
2. 匹配现有项目的标题、描述和上下文信息
3. 考虑项目的活跃度和相关性
4. 如果没有合适的现有项目，建议创建新项目

响应格式要求：
请返回JSON格式的响应，包含以下字段：
- recommended_project_id: 推荐的项目ID（如果有）
- recommended_project_name: 推荐项目的名称
- confidence_score: 置信度评分（0-1）
- reasoning: 推荐理由
- alternative_projects: 备选项目列表
- should_create_new: 是否应该创建新项目
- suggested_project_name: 建议的新项目名称（如果需要创建）

请确保响应是有效的JSON格式。"""

    def _build_user_prompt(
        self,
        query_text: str,
        user_projects: list[dict[str, Any]],
        relevant_tags: list[dict[str, Any]],
        context: dict[str, Any],
    ) -> str:
        """构造用户提示词"""

        projects_info = "\n".join(
            [
                f"- ID: {p['id']}, 标题: {p['title']}, 描述: {p.get('description', '无')}, 类型: {p['project_type']}"
                for p in user_projects
            ]
        )

        tags_info = "\n".join(
            [f"- {t['name']}: {t.get('description', '无描述')}" for t in relevant_tags]
        )

        return f"""用户问题："{query_text}"

现有项目：
{projects_info if projects_info else "无现有项目"}

相关标签：
{tags_info if tags_info else "无相关标签"}

上下文信息：
{json.dumps(context, ensure_ascii=False, indent=2) if context else "无"}

请分析这个问题，并推荐最合适的项目或建议创建新项目。"""

    def _parse_llm_response(
        self, llm_response: str, user_projects: list[dict[str, Any]]
    ) -> SmartRoutingResponse:
        """解析 LLM 响应"""

        try:
            # 尝试解析 JSON 响应
            response_data = json.loads(llm_response)

            # 验证推荐的项目ID是否存在
            recommended_project_id = response_data.get("recommended_project_id")
            if recommended_project_id:
                project_exists = any(
                    p["id"] == recommended_project_id for p in user_projects
                )
                if not project_exists:
                    recommended_project_id = None

            return SmartRoutingResponse(
                recommended_project_id=uuid.UUID(recommended_project_id)
                if recommended_project_id
                else None,
                recommended_project_name=response_data.get("recommended_project_name"),
                confidence_score=float(response_data.get("confidence_score", 0.0)),
                reasoning=response_data.get("reasoning", "AI 分析完成"),
                alternative_projects=response_data.get("alternative_projects", []),
                should_create_new=response_data.get("should_create_new", False),
                suggested_project_name=response_data.get("suggested_project_name"),
            )

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f"解析 LLM 响应失败: {e}, 响应内容: {llm_response}")

            # 回退到简单的文本分析
            return SmartRoutingResponse(
                confidence_score=0.3,
                reasoning="AI 响应解析失败，建议手动选择项目",
                should_create_new=len(user_projects) == 0,
                suggested_project_name=self._extract_topic_from_query(
                    llm_response[:100]
                ),
            )

    def _extract_topic_from_query(self, query_text: str) -> str:
        """从查询中提取主题作为项目名称"""

        # 简单的主题提取逻辑
        words = query_text.split()[:5]  # 取前5个词
        topic = " ".join(words)

        # 清理和格式化
        topic = topic.replace("？", "").replace("?", "")
        topic = topic.replace("请", "").replace("帮我", "")

        return topic[:50] if topic else "新项目"

    async def _record_routing_result(
        self,
        user_id: uuid.UUID,
        query_text: str,
        routing_result: SmartRoutingResponse,
    ) -> None:
        """记录路由结果到数据库"""

        try:
            query_route = QueryRoute(
                user_id=user_id,
                query_text=query_text,
                routed_project_id=routing_result.recommended_project_id,
                confidence_score=routing_result.confidence_score,
                routing_context={
                    "reasoning": routing_result.reasoning,
                    "alternatives": routing_result.alternative_projects,
                    "should_create_new": routing_result.should_create_new,
                    "suggested_name": routing_result.suggested_project_name,
                },
            )

            self.session.add(query_route)
            self.session.commit()

        except Exception as e:
            logger.error(f"记录路由结果失败: {e}")
            self.session.rollback()

    async def get_user_routing_history(
        self,
        user_id: uuid.UUID,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """获取用户的路由历史"""

        statement = (
            select(QueryRoute)
            .where(QueryRoute.user_id == user_id)
            .order_by(QueryRoute.created_at.desc())
            .limit(limit)
        )

        routes = self.session.exec(statement).all()

        return [
            {
                "id": str(route.id),
                "query_text": route.query_text,
                "routed_project_id": str(route.routed_project_id)
                if route.routed_project_id
                else None,
                "confidence_score": route.confidence_score,
                "routing_context": route.routing_context,
                "user_confirmed": route.user_confirmed,
                "created_at": route.created_at.isoformat(),
            }
            for route in routes
        ]

    async def confirm_routing(
        self,
        user_id: uuid.UUID,
        route_id: uuid.UUID,
        confirmed: bool,
    ) -> bool:
        """确认或拒绝路由建议"""

        try:
            statement = select(QueryRoute).where(
                and_(
                    QueryRoute.id == route_id,
                    QueryRoute.user_id == user_id,
                )
            )

            route = self.session.exec(statement).first()
            if not route:
                return False

            route.user_confirmed = confirmed
            self.session.commit()

            return True

        except Exception as e:
            logger.error(f"确认路由失败: {e}")
            self.session.rollback()
            return False
