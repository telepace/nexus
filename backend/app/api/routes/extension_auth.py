from datetime import timedelta
from typing import Any

import jwt
from fastapi import APIRouter, HTTPException, Request
from jwt.exceptions import InvalidTokenError

from app.api.deps import SessionDep
from app.core import security
from app.core.config import settings
from app.models import Token, User, UserPublic

router = APIRouter(tags=["extension"])


@router.get("/extension/auth/status")
def check_extension_auth_status(request: Request, session: SessionDep) -> Any:
    """
    Check authentication status for browser extension
    This endpoint allows the extension to check if the user is already logged in through the web app
    by reading the same cookies or authorization header
    """
    try:
        # 尝试从请求头获取令牌
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
            )
            user_id = payload.get("sub")
            user = session.get(User, user_id)
            if user and user.is_active:
                return {"authenticated": True, "user": UserPublic.model_validate(user)}

        # 从 cookie 获取令牌
        cookie_token = request.cookies.get("accessToken")
        if cookie_token:
            payload = jwt.decode(
                cookie_token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
            )
            user_id = payload.get("sub")
            user = session.get(User, user_id)
            if user and user.is_active:
                return {"authenticated": True, "user": UserPublic.model_validate(user)}

        # 未验证
        return {"authenticated": False}
    except Exception as e:
        return {"authenticated": False, "error": str(e)}


@router.post("/extension/auth/token")
def get_extension_token(request: Request, session: SessionDep) -> Any:
    """
    Generate a new token for extension based on existing web session
    This allows the extension to get a token if the user is already logged in via browser
    """
    try:
        # 尝试从 cookie 获取令牌
        cookie_token = request.cookies.get("accessToken")
        if cookie_token:
            try:
                payload = jwt.decode(
                    cookie_token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
                )
                user_id = payload.get("sub")
                user = session.get(User, user_id)

                if user and user.is_active:
                    # 为扩展创建新令牌
                    access_token_expires = timedelta(
                        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
                    )
                    token = security.create_access_token(
                        user.id, expires_delta=access_token_expires
                    )

                    return Token(access_token=token)
            except InvalidTokenError as e:
                raise HTTPException(status_code=401, detail=f"无效的网页会话: {str(e)}")

        raise HTTPException(status_code=401, detail="未找到有效的网页会话")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"获取扩展令牌失败: {str(e)}")
