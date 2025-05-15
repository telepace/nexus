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

# ... existing code ...