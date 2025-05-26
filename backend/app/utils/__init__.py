from importlib.util import find_spec

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

# Check if posthog is available
has_posthog = find_spec("posthog") is not None

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
