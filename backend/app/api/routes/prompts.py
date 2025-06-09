import logging
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import desc
from sqlmodel import Session, func, or_, select

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
from app.utils.timezone import TimezoneMiddleware

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
    request: Request,
    skip: int = 0,
    limit: int = 100,
):
    """获取标签列表"""
    try:
        # 提取用户时区
        user_timezone = TimezoneMiddleware.extract_user_timezone(dict(request.headers))

        tags = db.exec(select(Tag).offset(skip).limit(limit)).all()

        # 应用时区处理到每个标签
        processed_tags = []
        for tag in tags:
            tag_dict = tag.model_dump()
            processed_tag = TimezoneMiddleware.add_timezone_to_response(
                tag_dict, user_timezone
            )
            processed_tags.append(processed_tag)

        return processed_tags
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
    request: Request,
):
    """创建新标签"""
    try:
        # 提取用户时区
        user_timezone = TimezoneMiddleware.extract_user_timezone(dict(request.headers))

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

        # 应用时区处理
        tag_dict = tag.model_dump()
        processed_tag = TimezoneMiddleware.add_timezone_to_response(
            tag_dict, user_timezone
        )

        return Tag.model_validate(processed_tag)
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
    _request: Request,
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

        # 手动加载标签关系
        db.refresh(prompt, ["tags"])

        # 直接返回 PromptReadWithTags 对象，让 FastAPI 处理序列化
        return PromptReadWithTags.model_validate(prompt.model_dump())
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=list[Prompt])
def read_prompts(
    *,
    db: Session = Depends(get_db),
    _current_user: Any = Depends(get_current_user),
    request: Request,
    skip: int = 0,
    limit: int = 100,
    tag_ids: list[UUID] | None = Query(None),
    search: str | None = None,
    sort: str | None = None,
    order: str = "desc",
) -> list[Prompt]:
    """Read and return a list of prompts based on specified filters and sorting.

    The function constructs a query to retrieve prompts from the database, applying
    optional filters for tag IDs, search terms, and sorting by creation or update
    time. It also handles pagination through skip and limit parameters. Tags are
    manually loaded for each prompt after querying.

    Args:
        db (Session): Database session.
        _current_user (Any): Current user information (dependency).
        request (Request): FastAPI request object for timezone extraction.
        skip (int?): Number of records to skip. Defaults to 0.
        limit (int?): Maximum number of records to return. Defaults to 100.
        tag_ids (list[UUID] | None?): List of UUIDs for tags to filter prompts by.
        search (str | None?): Search term to filter prompts by name, description, or content.
        sort (str | None?): Field to sort the results by ('created_at' or 'updated_at'). Defaults to None.
        order (str?): Order of sorting ('asc' or 'desc'). Defaults to "desc".

    Returns:
        list[Prompt]: List of prompts matching the filters and sorted as specified.

    Raises:
        HTTPException: If an error occurs during database query execution.
    """
    try:
        # 提取用户时区
        user_timezone = TimezoneMiddleware.extract_user_timezone(dict(request.headers))

        # 构建基础查询
        query = select(Prompt)

        # 如果有标签过滤
        if tag_ids:
            # 使用子查询来过滤有指定标签的提示词
            tag_count = len(tag_ids)
            tag_subquery = (
                select(PromptTagLink.prompt_id)
                .where(PromptTagLink.tag_id.in_(tag_ids))  # type: ignore
                .group_by(PromptTagLink.prompt_id)  # type: ignore
                .having(func.count(PromptTagLink.tag_id) >= tag_count)  # type: ignore
            )
            query = query.where(Prompt.id.in_(tag_subquery))  # type: ignore

        # 搜索过滤
        if search:
            query = query.where(
                or_(
                    Prompt.name.contains(search),  # type: ignore
                    Prompt.content.contains(search),  # type: ignore
                    # 可以添加更多搜索字段
                    Prompt.description.contains(search)  # type: ignore
                    if hasattr(Prompt, "description")
                    else False,
                )
            )

        # 排序
        if sort == "created_at":
            query = query.order_by(  # type: ignore
                desc(Prompt.created_at) if order == "desc" else Prompt.created_at  # type: ignore
            )
        elif sort == "updated_at":
            query = query.order_by(  # type: ignore
                desc(Prompt.updated_at) if order == "desc" else Prompt.updated_at  # type: ignore
            )
        else:
            # 默认按更新时间倒序
            query = query.order_by(desc(Prompt.updated_at))  # type: ignore

        # 执行查询
        prompts = db.exec(query).all()
        # 手动加载标签
        for prompt in prompts:
            db.refresh(prompt, ["tags"])

        # 在 Python 中进行分页
        paginated_prompts = list(prompts[skip : skip + limit])

        # 应用时区处理到每个prompt的时间字段
        processed_prompts = []
        for prompt in paginated_prompts:
            prompt_dict = prompt.model_dump()
            # 处理时区感知的时间字段
            processed_prompt = TimezoneMiddleware.add_timezone_to_response(
                prompt_dict, user_timezone
            )
            processed_prompts.append(processed_prompt)

        return processed_prompts
    except Exception as e:
        logger.error(f"Error reading prompts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{prompt_id}", response_model=PromptReadWithTags)
def read_prompt(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    current_user: Any = Depends(get_current_user),
    _request: Request,
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

        # 直接返回 PromptReadWithTags 对象，让 FastAPI 处理序列化
        return PromptReadWithTags.model_validate(prompt.model_dump())
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
    request: Request,
    create_version: bool = False,
):
    """Update a prompt by its ID.

    This function updates the prompt in the database with new data provided. It
    checks for permissions, updates other fields, and handles version creation if
    specified. It also manages tag relationships by updating or clearing them as
    needed.

    Args:
        db (Session): The database session.
        prompt_id (UUID): The ID of the prompt to update.
        prompt_in (PromptUpdate): The data containing the new values for the prompt.
        current_user (Any): The current user making the request.
        request (Request): FastAPI request object for timezone extraction.
        create_version (bool): A flag indicating whether to create a new version.

    Returns:
        PromptReadWithTags: The updated prompt with tags included.

    Raises:
        HTTPException: If the prompt is not found, the user lacks permissions,
            or an error occurs during the update process.
    """
    try:
        # 提取用户时区（用于后续处理响应时间字段）
        _user_timezone = TimezoneMiddleware.extract_user_timezone(dict(request.headers))

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
            max_version_result = db.exec(
                select(func.max(PromptVersion.version)).where(
                    PromptVersion.prompt_id == prompt.id
                )
            ).first()
            max_version = max_version_result if max_version_result is not None else 0
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

            # 添加新的标签关系
            if tag_ids:
                for tag_id in tag_ids:
                    tag = db.get(Tag, tag_id)
                    if tag:
                        prompt.tags.append(tag)

        db.add(prompt)
        db.commit()
        db.refresh(prompt, ["tags"])

        # 直接返回 PromptReadWithTags 对象，让 FastAPI 处理序列化
        return PromptReadWithTags.model_validate(prompt.model_dump())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
    request: Request,
):
    """Get all versions of a prompt.

    This function retrieves all versions of a specific prompt. It first checks
    if the prompt exists and if the user has permission to access it, then
    returns a list of all versions sorted by version number in descending order.

    Args:
        db (Session): Database session.
        prompt_id (UUID): The ID of the prompt to get versions for.
        current_user (Any): Current user information (dependency).
        request (Request): FastAPI request object for timezone extraction.

    Returns:
        list[PromptVersion]: List of prompt versions sorted by version number.

    Raises:
        HTTPException: If the prompt is not found, user lacks permissions,
            or an error occurs during the query.
    """
    try:
        # 提取用户时区
        user_timezone = TimezoneMiddleware.extract_user_timezone(dict(request.headers))

        # 检查提示词是否存在和权限
        prompt = db.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        if not _check_prompt_access(prompt, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # 查询版本
        versions = db.exec(
            select(PromptVersion)
            .where(PromptVersion.prompt_id == prompt_id)
            .order_by(desc(PromptVersion.version))
        ).all()

        # 应用时区处理到每个版本
        processed_versions = []
        for version in versions:
            version_dict = version.model_dump()
            processed_version = TimezoneMiddleware.add_timezone_to_response(
                version_dict, user_timezone
            )
            processed_versions.append(processed_version)

        return processed_versions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading prompt versions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{prompt_id}/versions", response_model=PromptVersion)
def create_prompt_version(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    version_in: PromptVersionCreate,
    current_user: Any = Depends(get_current_user),
    request: Request,
) -> PromptVersion:
    """Creates a new version of a prompt.

    This function retrieves the prompt by its ID, checks for access permissions,
    determines the maximum existing version number, and then creates a new version
    with incremented version number, content, change notes, creation time, and
    creator ID. It handles exceptions by logging errors and raising HTTP
    exceptions.
    """
    try:
        # 提取用户时区
        user_timezone = TimezoneMiddleware.extract_user_timezone(dict(request.headers))

        # 检查提示词是否存在和权限
        prompt = db.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        if not _check_prompt_access(prompt, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # 查询最大版本号
        max_version_result = db.exec(
            select(func.max(PromptVersion.version)).where(
                PromptVersion.prompt_id == prompt_id
            )
        ).first()

        max_version = max_version_result if max_version_result is not None else 0

        # 创建新版本
        version = PromptVersion(
            prompt_id=prompt_id,
            version=max_version + 1,
            content=version_in.content,
            input_vars=version_in.input_vars,
            change_notes=version_in.change_notes,
            created_by=current_user.id,
        )

        db.add(version)
        db.commit()
        db.refresh(version)

        # 应用时区处理
        version_dict = version.model_dump()
        processed_version = TimezoneMiddleware.add_timezone_to_response(
            version_dict, user_timezone
        )

        return PromptVersion.model_validate(processed_version)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
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
    """Duplicates a prompt based on the provided prompt ID.

    This function retrieves the original prompt, checks for access permissions,
    creates a new duplicate with updated attributes such as name and visibility,
    copies associated tags, and initializes a new version for the duplicated
    prompt. If any errors occur during the process, it rolls back the database
    transaction and raises an appropriate HTTP exception.

    Args:
        db (Session): The database session dependency.
        prompt_id (UUID): The ID of the original prompt to be duplicated.
        current_user (Any): The current user making the request.
    """
    try:
        # 获取原始提示词
        original = db.get(Prompt, prompt_id)
        if not original:
            raise HTTPException(status_code=404, detail="Prompt not found")

        # 检查访问权限
        if not _check_prompt_access(original, current_user):
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # 确保加载原始提示词的标签
        db.refresh(original, ["tags"])

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
        db.add(duplicate)
        db.flush()  # 获取新提示词 ID

        # 复制标签关系
        if original.tags:
            for tag in original.tags:
                duplicate.tags.append(tag)

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
        db.refresh(duplicate, ["tags"])  # 确保加载标签关系

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


# ===== 快速切换启用状态 =====
@router.patch("/{prompt_id}/toggle-enabled", response_model=PromptReadWithTags)
def toggle_prompt_enabled(
    *,
    db: Session = Depends(get_db),
    prompt_id: UUID,
    current_user: Any = Depends(get_current_user),
):
    """快速切换提示词的启用状态"""
    try:
        prompt = db.get(Prompt, prompt_id)
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        # 检查权限
        if not _check_prompt_access(prompt, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to modify this prompt",
            )

        # 切换启用状态
        prompt.enabled = not prompt.enabled
        prompt.updated_at = datetime.utcnow()

        db.add(prompt)
        db.commit()
        db.refresh(prompt)
        # 确保加载标签关系
        db.refresh(prompt, ["tags"])

        logger.info(f"Toggled prompt {prompt_id} enabled status to: {prompt.enabled}")
        return PromptReadWithTags.model_validate(prompt)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"切换提示词启用状态失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"切换提示词启用状态失败: {str(e)}",
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
