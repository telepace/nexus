#!/usr/bin/env python3

import requests
import json
from app.core.config import settings

def test_favorites_api():
    """Test the favorites API endpoint to see detailed error."""
    
    # First, let's try to login and get a token
    login_data = {
        "username": "admin@telepace.cc",
        "password": "telepace"
    }
    
    try:
        # Login
        login_response = requests.post(
            f"{settings.server_host}/api/v1/login/access-token",
            data=login_data
        )
        print(f"Login response status: {login_response.status_code}")
        print(f"Login response: {login_response.text}")
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test favorites endpoint
            favorites_response = requests.get(
                f"{settings.server_host}/api/v1/favorites",
                headers=headers
            )
            print(f"Favorites response status: {favorites_response.status_code}")
            print(f"Favorites response: {favorites_response.text}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_favorites_api() 