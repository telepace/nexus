from importlib import util
from types import ModuleType

try:
    from app.utils import email
except ImportError:
    print("Warning: email utils not available")

try:
    from app.utils import posthog_tracker

    has_posthog = True
except ImportError:
    # Fallback to a stub module if posthog is not installed
    class PosthogStub:
        def capture(*args, **kwargs):
            pass

    posthog_tracker: ModuleType = PosthogStub()  # type: ignore[assignment]
    has_posthog = False

# 导入错误处理模块
try:
    from app.utils import error
except ImportError:
    print("Warning: error handling utils not available")

from .email import (
    EmailData,
    generate_new_account_email,
    generate_password_reset_token,
    generate_reset_password_email,
    generate_test_email,
    send_email,
    verify_password_reset_token,
)
from .posthog_tracker import PostHogTracker

__all__ = [
    "PostHogTracker",
    "generate_password_reset_token",
    "generate_reset_password_email",
    "send_email",
    "verify_password_reset_token",
    "EmailData",
    "generate_test_email",
    "generate_new_account_email",
]
