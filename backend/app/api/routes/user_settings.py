from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, SessionDep
from app.models.user_settings import UserSettingsPublic, UserSettingsUpdate
from app.services.user_settings_service import UserSettingsService

router = APIRouter()


@router.get(
    "/",
    response_model=UserSettingsPublic,
    summary="Get User Settings",
    description="获取当前用户的设置信息，包括 AI 输出语言偏好等。",
)
def get_user_settings(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> UserSettingsPublic:
    """获取用户设置"""
    user_settings = UserSettingsService.get_or_create_user_settings(
        session, current_user.id
    )
    return UserSettingsPublic.from_orm(user_settings)


@router.put(
    "/",
    response_model=UserSettingsPublic,
    summary="Update User Settings",
    description="更新用户设置，包括 AI 输出语言偏好等。",
)
def update_user_settings(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    settings_update: UserSettingsUpdate,
) -> UserSettingsPublic:
    """更新用户设置"""
    user_settings = UserSettingsService.update_user_settings(
        session, current_user.id, settings_update
    )

    if not user_settings:
        # 如果用户设置不存在，创建一个
        user_settings = UserSettingsService.get_or_create_user_settings(
            session, current_user.id
        )
        # 再次尝试更新
        user_settings = UserSettingsService.update_user_settings(
            session, current_user.id, settings_update
        )

    return UserSettingsPublic.from_orm(user_settings)


@router.get(
    "/ai-language",
    response_model=dict[str, str],
    summary="Get AI Output Language",
    description="获取用户的 AI 输出语言偏好。",
)
def get_ai_language(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> dict[str, str]:
    """获取用户的 AI 输出语言偏好"""
    language = UserSettingsService.get_user_ai_language(session, current_user.id)
    return {"ai_output_language": language}


@router.put(
    "/ai-language",
    response_model=dict[str, str],
    summary="Set AI Output Language",
    description="设置用户的 AI 输出语言偏好。支持的语言：English, Chinese, Japanese 等。",
)
def set_ai_language(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    language_data: dict[str, str],
) -> dict[str, str]:
    """设置用户的 AI 输出语言偏好"""
    language = language_data.get("ai_output_language")

    if not language:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ai_output_language is required"
        )

    # 验证语言选项
    supported_languages = ["English", "Chinese", "Japanese", "Korean", "French", "German", "Spanish"]
    if language not in supported_languages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language. Supported languages: {', '.join(supported_languages)}"
        )

    UserSettingsService.set_user_ai_language(session, current_user.id, language)
    return {"ai_output_language": language, "message": "Language preference updated successfully"}
