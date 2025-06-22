#!/usr/bin/env python3

from fastapi import FastAPI
from app.api.routes import api_router

def debug_routes():
    """Debug the registered routes."""
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    
    print("Registered routes:")
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            print(f"  {route.methods} {route.path}")
    
    # Check specifically for favorites routes
    favorites_routes = [route for route in app.routes 
                       if hasattr(route, 'path') and '/favorites' in route.path]
    print(f"\nFavorites routes found: {len(favorites_routes)}")
    for route in favorites_routes:
        if hasattr(route, 'methods'):
            print(f"  {route.methods} {route.path}")

if __name__ == "__main__":
    debug_routes() 