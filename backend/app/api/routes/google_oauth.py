import secrets
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode
import logging

import requests
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app import crud
from app.api.deps import SessionDep
from app.core.config import settings
from app.core.security import create_access_token
from app.models import User

# u8bbeu7f6eu65e5u5fd7
logger = logging.getLogger("app.google_oauth")

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
    This is maintained for backward compatibility but not used in the new flow
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
    This endpoint redirects to Google's login page
    """
    # Check if credentials are configured
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.error("Google OAuth credentials not configured properly")
        return RedirectResponse(
            f"{settings.FRONTEND_HOST}/login?error=oauth_config_error"
        )
        
    # u6253u5370u914du7f6eu4fe1u606fu4fbfu4e8eu8c03u8bd5
    logger.info(f"Google OAuth using redirect_uri: {settings.google_oauth_redirect_uri}")
    logger.info(f"Make sure this matches the Authorized redirect URIs in Google Console")
        
    # Generate a random state value to prevent CSRF attacks
    state = secrets.token_urlsafe(16)
    request.session["google_oauth_state"] = state
    
    # u6253u5370u5f53u524du7684 session u72b6u6001
    logger.info(f"Generated OAuth state: {state}")

    # Construct the authorization URL
    auth_params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(auth_params)}"
    logger.info(f"Redirecting to Google authorization URL: {auth_url}")
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
    This endpoint is called by Google after the user has logged in
    """
    logger.info(f"Received Google OAuth callback: code={bool(code)}, state={bool(state)}, error={error or 'None'}")
    
    # Check for errors
    if error:
        logger.error(f"Google OAuth error: {error}")
        return RedirectResponse(
            f"{settings.FRONTEND_HOST}/login?error=oauth_error&message={error}"
        )

    # Verify state to prevent CSRF attacks
    stored_state = request.session.get("google_oauth_state")
    logger.info(f"Validating state: received={state}, stored={stored_state}")
    
    if not stored_state or stored_state != state:
        logger.error(f"State validation failed: stored={stored_state}, received={state}")
        return RedirectResponse(f"{settings.FRONTEND_HOST}/login?error=invalid_state")

    # Clear the state from session
    request.session.pop("google_oauth_state", None)
    logger.info("State validated successfully and cleared from session")

    if not code:
        logger.error("No authorization code provided")
        return RedirectResponse(f"{settings.FRONTEND_HOST}/login?error=no_code")

    try:
        # Exchange the authorization code for tokens
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.google_oauth_redirect_uri,
            "grant_type": "authorization_code",
        }
        
        logger.info(f"Exchanging code for token with redirect_uri: {settings.google_oauth_redirect_uri}")

        token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)
        token_response.raise_for_status()
        tokens = token_response.json()
        logger.info("Successfully obtained tokens from Google")

        # Get user information using the access token
        user_info_response = requests.get(
            GOOGLE_USER_INFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
        logger.info(f"Retrieved user info from Google: email={user_info.get('email')}")

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
            logger.info(f"Created new user for Google account: {user_info['email']}")
        elif not user.google_id:
            # Update existing user with Google ID
            user.google_id = user_info["sub"]
            session.add(user)
            session.commit()
            session.refresh(user)
            logger.info(f"Updated existing user with Google ID: {user_info['email']}")
        else:
            logger.info(f"User already exists: {user_info['email']}")

        # Create access token for the user
        access_token = create_access_token(
            subject=user.id,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        logger.info(f"Generated access token for user: {user_info['email']}")

        # Redirect to frontend with token
        redirect_url = f"{settings.FRONTEND_HOST}/login/google/callback?token={access_token}"
        logger.info(f"Redirecting to frontend: {redirect_url}")
        return RedirectResponse(redirect_url)

    except Exception as e:
        logger.exception(f"Google OAuth callback error: {str(e)}")
        return RedirectResponse(
            f"{settings.FRONTEND_HOST}/login?error=server_error&message={str(e)}"
        )
