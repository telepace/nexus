import logging
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Column, Integer, desc
from sqlalchemy import func as sa_func
from sqlmodel import Session, col, func, or_, select

from app.api.deps import get_current_user, get_db
from app.models.prompt import (
    Prompt,
    PromptCreate,
    PromptReadWithTags,
    PromptTagLink,
    PromptUpdate,
    PromptVersion,
    PromptVersionCreate,
    Tag,
    TagCreate,
    TagUpdate,
)

# 避免导入User类以避免循环导入
# from app.models import User

# 为路由器添加标签
router = APIRouter(tags=["prompts"])
logger = logging.getLogger(__name__)


# ===== 标签管理 =====
# 将标签路由放在最前面，避免与 /{prompt_id} 路由冲突
@router.get("/tags", response_model=list[Tag])
def read_tags(
    *,
    db: Session = Depends(get_db),
    _current_user: Any = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """获取标签列表"""
    try:
        tags = db.exec(select(Tag).offset(skip).limit(limit)).all()
        return tags
    except Exception as e:
        logger.error(f"获取标签列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取标签列表失败: {str(e)}",
        )


@router.post("/tags", response_model=Tag, status_code=status.HTTP_201_CREATED)
def create_tag(
    *,
    db: Session = Depends(get_db),
    tag_in: TagCreate,
    _current_user: Any = Depends(get_current_user),
):
    """创建新标签"""
    try:
        # 检查是否已存在同名标签
        existing = db.exec(select(Tag).where(Tag.name == tag_in.name)).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tag with name '{tag_in.name}' already exists",
            )

        tag = Tag(**tag_in.model_dump())
        db.add(tag)
        db.commit()
        db.refresh(tag)
        return tag
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"创建标签失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建标签失败: {str(e)}",
        )


@router.put("/tags/{tag_id}", response_model=Tag)
def update_tag(
    *,
    db: Session = Depends(get_db),
    tag_id: UUID,
    tag_in: TagUpdate,
    _current_user: Any = Depends(get_current_user),
):
    """更新标签"""
    try:
        tag = db.get(Tag, tag_id)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        # 检查名称是否重复
        if tag_in.name and tag_in.name != tag.name:
            existing = db.exec(select(Tag).where(Tag.name == tag_in.name)).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Tag with name '{tag_in.name}' already exists",
                )

        # 更新字段
        update_data = tag_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tag, key, value)

        db.add(tag)
        db.commit()
        db.refresh(tag)
        return tag
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新标签失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新标签失败: {str(e)}",
        )


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    *,
    db: Session = Depends(get_db),
    tag_id: UUID,
    current_user: Any = Depends(get_current_user),
):
    """删除标签 (需要超级用户权限)"""
    try:
        # 检查权限
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=403, detail="Only superusers can delete tags"
            )

        tag = db.get(Tag, tag_id)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        # 删除标签 (关联会自动解除)
        db.delete(tag)
        db.commit()

        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除标签失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除标签失败: {str(e)}",
        )


# ===== 提示词 CRUD 操作 =====
@router.post(
    "/", response_model=PromptReadWithTags, status_code=status.HTTP_201_CREATED
)
def create_prompt(
    *,
    db: Session = Depends(get_db),
    prompt_in: PromptCreate,
    current_user: Any = Depends(get_current_user),
):
    """创建新的提示词"""
    try:
        # 从输入中提取标签 ID 列表
        tag_ids = prompt_in.tag_ids or []
        prompt_data = prompt_in.model_dump(exclude={"tag_ids"})

        # 创建提示词
        prompt = Prompt(**prompt_data, created_by=current_user.id)
        db.add(prompt)
        db.flush()  # 获取ID但不提交事务

        # 添加标签关联
        if tag_ids:
            for tag_id in tag_ids:
                tag = db.get(Tag, tag_id)
                if tag:
                    prompt.tags.append(tag)

        # 创建初始版本
        version = PromptVersion(
            prompt_id=prompt.id,
            version=1,
            content=prompt.content,
            input_vars=prompt.input_vars,
            created_by=current_user.id,
        )
        db.add(version)

        db.commit()
        db.refresh(prompt)
        # 确保加载标签关系
        db.refresh(prompt, ["tags"])
        return PromptReadWithTags.model_validate(prompt)
    except Exception as e:
        db.rollback()
        logger.error(f"创建提示词失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建提示词失败: {str(e)}",
        )


@router.get("/", response_model=list[Prompt])
def read_prompts(
    *,
    db: Session = Depends(get_db),
    _current_user: Any = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    tag_ids: list[UUID] | None = Query(None),
    search: str | None = None,
    sort: str | None = None,
    order: str = "desc",
) -> list[Prompt]:
    """获取提示词列表"""
    try:
        # 构建基础查询
        query = select(Prompt)

        # 如果指定了标签，添加标签过滤
        if tag_ids:
            # 使用子查询获取包含所有指定标签的提示词ID
            prompt_ids = (
                select(PromptTagLink.prompt_id)
                .where(col(PromptTagLink.tag_id).in_(tag_ids))
                .group_by(col(PromptTagLink.prompt_id))
                .having(func.count(col(PromptTagLink.tag_id)) == len(tag_ids))
            )
            query = query.where(col(Prompt.id).in_(prompt_ids.scalar_subquery()))

        # 如果指定了搜索关键词，添加搜索过滤
        if search:
            search_filter = or_(
                col(Prompt.name).contains(search),
                col(Prompt.description).contains(search)
                if Prompt.description is not None
                else False,
                col(Prompt.content).contains(search),
            )
            query = query.where(search_filter)

        # 添加排序
        if sort == "created_at":
            order_col = col(Prompt.created_at)
            query = query.order_by(desc(order_col) if order == "desc" else order_col)
        elif sort == "updated_at":
            order_col = col(Prompt.updated_at)
            query = query.order_by(desc(order_col) if order == "desc" else order_col)
        else:
            # 默认按创建时间排序
            query = query.order_by(desc(col(Prompt.created_at)))

        # 执行查询
        prompts = db.exec(query).all()
        # 手动加载标签
        for prompt in prompts:
            db.refresh(prompt, ["tags"])
        # 在 Python 中进行分页
        return list(prompts[skip : skip + limit])
    except Exception as e:
        logger.error(f"Error reading prompts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{prompt_id}", response_model=PromptReadWithTags)
def read_prompt(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    current_user: Any = Depends(get_current_user),
) -> PromptReadWithTags:
    """获取提示词详情"""
    try:
        # 使用 select 而不是 get，以便能够显式加载关系
        prompt = db.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        # 检查访问权限
        if not _check_prompt_access(prompt, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")
        # 手动加载标签
        db.refresh(prompt, ["tags"])
        return PromptReadWithTags.model_validate(prompt)
    except HTTPException as e:
        # 如果是 HTTPException，直接传递
        logger.error(f"Error reading prompt: {e}")
        raise
    except Exception as e:
        logger.error(f"Error reading prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{prompt_id}", response_model=PromptReadWithTags)
def update_prompt(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    prompt_in: PromptUpdate,
    current_user: Any = Depends(get_current_user),
    create_version: bool = False,
):
    """更新提示词"""
    try:
        prompt = db.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        # 检查权限
        if not _check_prompt_access(prompt, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # 先保存更新前的内容和输入变量（已移除未使用变量）
        # pre_content = prompt.content
        # pre_input_vars = prompt.input_vars

        # 更新标签关系
        tag_ids = None
        update_data = prompt_in.model_dump(exclude_unset=True)
        if "tag_ids" in update_data:
            tag_ids = update_data.pop("tag_ids")

        # 更新其他字段
        for key, value in update_data.items():
            setattr(prompt, key, value)

        # 更新时间戳
        prompt.updated_at = datetime.utcnow()

        # 如果内容有更改且需要创建新版本
        if create_version and "content" in update_data:
            # 1. 先复制旧内容
            old_content = prompt.content
            old_input_vars = prompt.input_vars
            # 2. 查询最大版本号
            max_version = (
                db.exec(
                    select(sa_func.max(PromptVersion.version)).where(
                        PromptVersion.prompt_id == prompt.id
                    )
                ).first()
                or 0
            )
            # 3. 用旧内容和新版本号创建 PromptVersion
            version = PromptVersion(
                prompt_id=prompt.id,
                version=max_version + 1,
                content=old_content,
                input_vars=old_input_vars,
                created_by=current_user.id,
            )
            db.add(version)

        # 更新标签关系
        if tag_ids is not None:
            # 清除现有关系
            prompt.tags = []
            db.flush()

            # 添加新标签
            for tag_id in tag_ids:
                tag = db.get(Tag, tag_id)
                if tag:
                    prompt.tags.append(tag)

        db.add(prompt)
        db.commit()
        db.refresh(prompt)
        # 确保加载标签关系
        db.refresh(prompt, ["tags"])
        return PromptReadWithTags.model_validate(prompt)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新提示词失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新提示词失败: {str(e)}",
        )


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prompt(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    current_user: Any = Depends(get_current_user),
):
    """删除提示词"""
    try:
        # 使用 select 获取提示词以便检查权限
        prompt = db.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        # 检查权限
        if not _check_prompt_access(prompt, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # 删除提示词
        db.delete(prompt)
        db.commit()

        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除提示词失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除提示词失败: {str(e)}",
        )


# ===== 版本管理 =====
@router.get("/{prompt_id}/versions", response_model=list[PromptVersion])
def read_prompt_versions(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    current_user: Any = Depends(get_current_user),
):
    """获取提示词的版本历史"""
    try:
        # 获取提示词
        prompt = db.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        # 检查权限
        if not _check_prompt_access(prompt, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # 获取版本列表，按版本号降序排序
        query = (
            select(PromptVersion)
            .where(PromptVersion.prompt_id == prompt_id)
            .order_by(Column("version", Integer).desc())
        )
        versions = db.exec(query).all()
        return versions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取版本历史失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取版本历史失败: {str(e)}",
        )


@router.post("/{prompt_id}/versions", response_model=PromptVersion)
def create_prompt_version(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    version_in: PromptVersionCreate,
    current_user: Any = Depends(get_current_user),
) -> PromptVersion:
    """创建新版本"""
    try:
        # 获取提示词
        prompt = db.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        # 检查访问权限
        if not _check_prompt_access(prompt, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # 获取当前最大版本号
        max_version = (
            db.exec(
                select(sa_func.max(PromptVersion.version)).where(
                    PromptVersion.prompt_id == prompt_id
                )
            ).first()
            or 0
        )

        # 创建新版本
        version = PromptVersion(
            prompt_id=prompt_id,
            content=version_in.content,
            change_notes=version_in.change_notes,
            version=max_version + 1,
            created_at=datetime.utcnow(),
            created_by=current_user.id,
        )
        db.add(version)
        db.commit()
        db.refresh(version)

        return version
    except Exception as e:
        logger.error(f"Error creating prompt version: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{prompt_id}/versions/{version_num}", response_model=PromptVersion)
def read_prompt_version(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    version_num: int,
    current_user: Any = Depends(get_current_user),
):
    """获取提示词特定版本"""
    try:
        prompt = db.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        # 检查权限
        if not _check_prompt_access(prompt, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # 获取特定版本
        version = db.exec(
            select(PromptVersion).where(
                PromptVersion.prompt_id == prompt_id,
                PromptVersion.version == version_num,
            )
        ).first()

        if not version:
            raise HTTPException(status_code=404, detail="Version not found")

        return version
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取提示词特定版本失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取提示词特定版本失败: {str(e)}",
        )


@router.post("/{prompt_id}/duplicate", response_model=Prompt)
def duplicate_prompt(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    current_user: Any = Depends(get_current_user),
):
    """复制提示词"""
    try:
        # 获取原始提示词
        original = db.get(Prompt, prompt_id)
        if not original:
            raise HTTPException(status_code=404, detail="Prompt not found")

        # 检查访问权限
        if not _check_prompt_access(original, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # 创建新的提示词副本
        duplicate_data = original.model_dump(
            exclude={
                "id",
                "created_at",
                "updated_at",
                "created_by",
                "tags",
                "versions",
                "embedding",
            }
        )

        # 修改名称，并设置为私有
        duplicate_data["name"] = f"{original.name} (复制)"
        duplicate_data["visibility"] = "private"

        # 创建新提示词
        duplicate = Prompt(**duplicate_data, created_by=current_user.id)

        # 复制标签
        if original.tags:
            for tag in original.tags:
                duplicate.tags.append(tag)

        db.add(duplicate)
        db.flush()  # 获取新提示词 ID

        # 创建初始版本
        version = PromptVersion(
            prompt_id=duplicate.id,
            version=1,
            content=duplicate.content,
            input_vars=duplicate.input_vars,
            created_by=current_user.id,
            change_notes="复制的初始版本",
        )
        db.add(version)

        db.commit()
        db.refresh(duplicate)

        return duplicate
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"复制提示词失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"复制提示词失败: {str(e)}",
        )


# ===== 辅助函数 =====
def _check_prompt_access(prompt: Prompt, user: Any) -> bool:
    """检查用户是否有权限访问提示词

    Args:
        prompt: 提示词对象
        user: 用户对象

    Returns:
        bool: 是否有权限访问
    """
    # 超级用户可以访问所有提示词
    if getattr(user, "is_superuser", False):
        return True

    # 创建者可以访问自己的提示词
    if prompt.created_by == user.id:
        return True

    # 公开提示词任何人都可以访问
    if prompt.visibility == "public":
        return True

    # 团队提示词需要检查团队权限
    if prompt.visibility == "team" and prompt.team_id:
        user_teams = [team.id for team in getattr(user, "teams", [])]
        return bool(user_teams and prompt.team_id in user_teams)

    return False
