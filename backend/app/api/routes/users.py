import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import col, delete, func, select

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
    get_storage_service,
)
from app.core.config import settings
from app.core.security import decrypt_password, get_password_hash, verify_password
from app.core.storage import StorageInterface
from app.models import (
    Message,
    Project,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.utils import generate_new_account_email, send_email

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve users.
    """

    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()

    statement = select(User).offset(skip).limit(limit)
    users = session.exec(statement).all()

    return UsersPublic(data=users, count=count)


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic
)
def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    user = crud.create_user(session=session, user_create=user_in)
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email, password=user_in.password
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    if not current_user.hashed_password:
        raise HTTPException(status_code=400, detail="User has no password set")

    decrypted_current_password = decrypt_password(body.current_password)
    if not verify_password(decrypted_current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    decrypted_new_password = decrypt_password(body.new_password)
    if decrypted_current_password == decrypted_new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(decrypted_new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.head("/me")
def read_user_me_head(_current_user: CurrentUser) -> dict[str, Any]:
    """
    HEAD request for user info endpoint - used by browser extensions to check token validity
    Returns headers without body
    """
    return {}  # FastAPI will automatically convert this to a HEAD response


@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Delete own user.
    """
    if current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )

    # Clean up related records before deleting the user
    from sqlmodel import delete

    from app.models.content import (
        AIConversation,
        AIResult,
        ContentAsset,
        ContentItem,
        ContentShare,
        ProcessingJob,
        Segment,
    )

    # Delete AI conversations first (they reference user_id)
    ai_conversations_stmt = delete(AIConversation).where(
        AIConversation.user_id == current_user.id
    )
    session.exec(ai_conversations_stmt)

    # Get all content items owned by the user
    content_items_stmt = select(ContentItem).where(
        ContentItem.user_id == current_user.id
    )
    user_content_items = session.exec(content_items_stmt).all()

    # For each content item, clean up related records
    for content_item in user_content_items:
        # Delete segments
        segments_stmt = delete(Segment).where(
            Segment.content_item_id == content_item.id
        )
        session.exec(segments_stmt)

        # Delete content assets
        assets_stmt = delete(ContentAsset).where(
            ContentAsset.content_item_id == content_item.id
        )
        session.exec(assets_stmt)

        # Delete content shares
        shares_stmt = delete(ContentShare).where(
            ContentShare.content_item_id == content_item.id
        )
        session.exec(shares_stmt)

        # Delete AI results
        ai_results_stmt = delete(AIResult).where(
            AIResult.content_item_id == content_item.id
        )
        session.exec(ai_results_stmt)

        # Delete processing jobs
        jobs_stmt = delete(ProcessingJob).where(
            ProcessingJob.content_item_id == content_item.id
        )
        session.exec(jobs_stmt)

    # Delete content items
    content_items_delete_stmt = delete(ContentItem).where(
        ContentItem.user_id == current_user.id
    )
    session.exec(content_items_delete_stmt)

    # Delete projects owned by the user
    from app.models.project import Project

    projects_stmt = delete(Project).where(Project.owner_id == current_user.id)
    session.exec(projects_stmt)

    # Finally, delete the user
    session.delete(current_user)
    session.commit()
    return Message(message="User deleted successfully")


@router.post("/signup", response_model=UserPublic)
def register_user(session: SessionDep, user_in: UserRegister) -> Any:
    """
    Create new user without the need to be logged in.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = crud.create_user(session=session, user_create=user_create)
    return user


@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user.
    """

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )

    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    """
    Delete a user.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    statement = delete(Project).where(col(Project.owner_id) == user_id)
    session.exec(statement)  # type: ignore
    session.delete(user)
    session.commit()
    return Message(message="User deleted successfully")


@router.post("/me/avatar", response_model=UserPublic)
async def upload_user_avatar(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    storage_service: StorageInterface = Depends(get_storage_service),
    avatar: UploadFile = File(...),
) -> Any:
    """
    Upload and update user avatar.
    """
    # 验证文件类型
    if not avatar.content_type or not avatar.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only image files are allowed."
        )

    # 验证文件大小 (限制为 2MB)
    avatar.file.seek(0, 2)  # 移动到文件末尾
    file_size = avatar.file.tell()
    avatar.file.seek(0)  # 重置到文件开头

    if file_size > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(
            status_code=400, detail="File too large. Maximum size is 2MB."
        )

    try:
        # 生成唯一的文件名
        file_extension = (
            avatar.filename.split(".")[-1]
            if avatar.filename and "." in avatar.filename
            else "jpg"
        )
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        blob_name = f"avatars/{current_user.id}/{unique_filename}"

        # 读取文件内容
        file_content = await avatar.read()

        # 上传到存储服务
        avatar_url = await storage_service.upload_file(
            file_content=file_content,
            destination_blob_name=blob_name,
            content_type=avatar.content_type,
        )

        if not avatar_url:
            raise HTTPException(
                status_code=500, detail="Failed to upload avatar to storage service."
            )

        # 更新用户的头像URL
        current_user.avatar_url = avatar_url
        session.add(current_user)
        session.commit()
        session.refresh(current_user)

        return current_user

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to upload avatar: {str(e)}"
        )
