#!/usr/bin/env python3

import sys
import traceback
from fastapi.testclient import TestClient
from app.main import app

def test_favorites_api():
    """Test the favorites API endpoints directly."""
    client = TestClient(app)
    
    try:
        # Test without authentication first
        print("Testing /api/v1/favorites without auth:")
        response = client.get("/api/v1/favorites")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        print()
        
        # Test with fake auth
        print("Testing /api/v1/favorites with fake auth:")
        headers = {"Authorization": "Bearer fake-token"}
        response = client.get("/api/v1/favorites", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        print()
        
        # Test content-ids endpoint
        print("Testing /api/v1/favorites/content-ids:")
        response = client.get("/api/v1/favorites/content-ids", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        print()
        
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_favorites_api() 