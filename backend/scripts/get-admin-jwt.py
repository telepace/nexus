#!/usr/bin/env python3
"""
Get admin JWT script.

This script logs in as the admin user and prints the JWT access token.
"""

import os
import sys
from pathlib import Path

import requests

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Local imports after path modification
from app.core.config import settings  # noqa: E402

# Try multiple possible API URLs
API_URLS = [
    os.environ.get("BACKEND_API_URL"),
    getattr(settings, "BACKEND_API_URL", None),
    "http://localhost:8000",  # Default local development
    "http://api.localhost.nip.io",  # Traefik setup
]

ADMIN_EMAIL = os.environ.get("FIRST_SUPERUSER") or getattr(
    settings, "FIRST_SUPERUSER", "admin@telepace.cc"
)
ADMIN_PASSWORD = os.environ.get("FIRST_SUPERUSER_PASSWORD") or getattr(
    settings, "FIRST_SUPERUSER_PASSWORD", "telepace"
)


def get_jwt():
    """Login as admin and get JWT token."""
    data = {
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    }

    # Try each API URL until one works
    for api_url in API_URLS:
        if not api_url:
            continue

        login_url = f"{api_url}/api/v1/login/access-token"
        print(f"🔄 Trying: {login_url}", file=sys.stderr)

        try:
            resp = requests.post(login_url, data=data, timeout=10)
            if resp.status_code == 200 and resp.json().get("access_token"):
                token = resp.json()["access_token"]
                print(f"✅ Success with: {api_url}", file=sys.stderr)
                print(token)
                return
            else:
                print(
                    f"❌ Failed with {api_url}. Status: {resp.status_code}",
                    file=sys.stderr,
                )
        except Exception as e:
            print(f"❌ Exception with {api_url}: {e}", file=sys.stderr)
            continue

    print("❌ All API URLs failed", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    get_jwt()
