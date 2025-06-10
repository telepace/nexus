import uuid
from typing import Any

from fastapi import APIRouter
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Project,
    ProjectCreate,
    ProjectPublic,
    ProjectsPublic,
    ProjectUpdate,
)
from app.utils.error import NotFoundError, PermissionError
from app.utils.response import ApiResponse

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=ApiResponse[ProjectsPublic])
def read_items(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve items.
    """

    if current_user.is_superuser:
        count_statement = select(func.count()).select_from(Project)
        count = session.exec(count_statement).one()
        statement = select(Project).offset(skip).limit(limit)
        items = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(Project)
            .where(Project.owner_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(Project)
            .where(Project.owner_id == current_user.id)
            .offset(skip)
            .limit(limit)
        )
        items = session.exec(statement).all()

    items_data = ProjectsPublic(data=items, count=count)
    return ApiResponse(data=items_data, meta={"skip": skip, "limit": limit})


@router.get("/{id}", response_model=ApiResponse[ProjectPublic])
def read_item(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get item by ID.
    """
    item = session.get(Project, id)
    if not item:
        raise NotFoundError(message=f"找不到ID为{id}的项目")

    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise PermissionError(message="没有权限访问此项目")

    return ApiResponse(data=item)


@router.post("/", response_model=ApiResponse[ProjectPublic])
def create_project(
    *, session: SessionDep, current_user: CurrentUser, item_in: ProjectCreate
) -> Any:
    """
    Create new item.
    """
    item = Project.model_validate(item_in, update={"owner_id": current_user.id})
    session.add(item)
    session.commit()
    session.refresh(item)
    return ApiResponse(data=item, meta={"message": "项目创建成功"})


@router.put("/{id}", response_model=ApiResponse[ProjectPublic])
def update_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    item_in: ProjectUpdate,
) -> Any:
    """
    Update an item.
    """
    item = session.get(Project, id)
    if not item:
        raise NotFoundError(message=f"找不到ID为{id}的项目")

    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise PermissionError(message="没有权限更新此项目")

    update_dict = item_in.model_dump(exclude_unset=True)
    item.sqlmodel_update(update_dict)
    session.add(item)
    session.commit()
    session.refresh(item)
    return ApiResponse(data=item, meta={"message": "项目更新成功"})


@router.delete("/{id}", response_model=ApiResponse[None])
def delete_item(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Delete an item.
    """
    item = session.get(Project, id)
    if not item:
        raise NotFoundError(message=f"找不到ID为{id}的项目")

    if not current_user.is_superuser and (item.owner_id != current_user.id):
        raise PermissionError(message="没有权限删除此项目")

    session.delete(item)
    session.commit()
    return ApiResponse(data=None, meta={"message": "项目删除成功"})
