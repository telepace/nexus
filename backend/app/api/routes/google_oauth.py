import secrets
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app import crud
from app.api.deps import SessionDep
from app.core.config import settings
from app.core.security import create_access_token
from app.models import User

router = APIRouter(tags=["google_oauth"])

# Google OAuth 2.0 endpoints
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


class GoogleCallbackRequest(BaseModel):
    token: str
    user_info: dict[str, Any]


@router.post("/auth/google-callback")
async def google_callback_api(
    request_data: GoogleCallbackRequest,
    session: SessionDep,
):
    """
    Handle Google OAuth callback from frontend
    """
    try:
        # Verify the token with Google
        user_info_response = requests.get(
            GOOGLE_USER_INFO_URL,
            headers={"Authorization": f"Bearer {request_data.token}"},
        )
        user_info_response.raise_for_status()

        # Get the verified user info directly from Google
        user_info = user_info_response.json()

        # Validate that the user_info from the request matches the verified one
        if user_info.get("sub") != request_data.user_info.get("sub"):
            raise HTTPException(status_code=400, detail="User info verification failed")

        # Find or create user based on email
        user = crud.get_user_by_email(session=session, email=user_info["email"])

        if not user:
            # Create a new user
            user_data = {
                "email": user_info["email"],
                "full_name": user_info.get("name", ""),
                "is_active": True,
                "google_id": user_info["sub"],
            }
            user = crud.create_user_oauth(session=session, obj_in=User(**user_data))
        elif not user.google_id:
            # Update existing user with Google ID
            user.google_id = user_info["sub"]
            session.add(user)
            session.commit()
            session.refresh(user)

        # Create access token for the user
        access_token = create_access_token(
            subject=user.id,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        # Return the token
        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google OAuth error: {str(e)}")


@router.get("/login/google")
async def google_login(request: Request):
    """
    Initiate Google OAuth2 authentication flow
    """
    # Generate a random state value to prevent CSRF attacks
    state = secrets.token_urlsafe(16)
    request.session["google_oauth_state"] = state

    # Construct the authorization URL
    auth_params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(auth_params)}"
    return RedirectResponse(auth_url)


@router.get("/login/google/callback")
async def google_callback(
    request: Request,
    session: SessionDep,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    """
    Handle the callback from Google OAuth
    """
    # Check for errors
    if error:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=oauth_error&message={error}"
        )

    # Verify state to prevent CSRF attacks
    stored_state = request.session.get("google_oauth_state")
    if not stored_state or stored_state != state:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=invalid_state")

    # Clear the state from session
    request.session.pop("google_oauth_state", None)

    if not code:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=no_code")

    try:
        # Exchange the authorization code for tokens
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)
        token_response.raise_for_status()
        tokens = token_response.json()

        # Get user information using the access token
        user_info_response = requests.get(
            GOOGLE_USER_INFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()

        # Find or create user based on email
        user = crud.get_user_by_email(session=session, email=user_info["email"])

        if not user:
            # Create a new user
            user_data = {
                "email": user_info["email"],
                "full_name": user_info.get("name", ""),
                "is_active": True,
                "google_id": user_info["sub"],
            }
            user = crud.create_user_oauth(session=session, obj_in=User(**user_data))
        elif not user.google_id:
            # Update existing user with Google ID
            user.google_id = user_info["sub"]
            session.add(user)
            session.commit()
            session.refresh(user)

        # Create access token for the user
        access_token = create_access_token(
            subject=user.id,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        # Redirect to frontend with token
        redirect_url = (
            f"{settings.FRONTEND_URL}/login/google/callback?token={access_token}"
        )
        return RedirectResponse(redirect_url)

    except Exception as e:
        print(f"Google OAuth error: {str(e)}")
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=server_error&message={str(e)}"
        )
