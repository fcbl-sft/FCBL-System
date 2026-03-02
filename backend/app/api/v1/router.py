"""
API v1 Router - Combines all route modules.
"""
from fastapi import APIRouter

from app.api.v1.routes import styles
from app.api.v1.routes import users

api_router = APIRouter()

# Include all route modules
api_router.include_router(styles.router)
api_router.include_router(users.router)
