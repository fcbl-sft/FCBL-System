"""
Authentication middleware for FastAPI.

Provides JWT-based authentication using Supabase Auth.
All user-management endpoints MUST use these dependencies.
"""
import logging
from typing import Any, Dict

from fastapi import Depends, HTTPException, Request, status
from supabase import create_client

from app.config import get_settings

logger = logging.getLogger(__name__)


async def require_auth(request: Request) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts and validates the JWT from the
    Authorization header.  Returns the authenticated user dict on success,
    raises 401 on failure.

    Usage:
        @router.post("/")
        async def my_endpoint(user=Depends(require_auth)):
            ...
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    try:
        # Use the service role client to validate any user's token
        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        user_response = client.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {
            "id": str(user_response.user.id),
            "email": user_response.user.email,
            "role": user_response.user.user_metadata.get("role", "viewer") if user_response.user.user_metadata else "viewer",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auth verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_admin(user: Dict[str, Any] = Depends(require_auth)) -> Dict[str, Any]:
    """
    FastAPI dependency that requires the caller to be an admin or super_admin.
    Must be used on all user-management endpoints.

    Usage:
        @router.post("/")
        async def my_endpoint(admin=Depends(require_admin)):
            ...
    """
    settings = get_settings()
    try:
        # Fetch the profile from DB to get the authoritative role
        # (user_metadata.role can be stale)
        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        profile_resp = (
            client.from_("profiles")
            .select("role")
            .eq("id", user["id"])
            .single()
            .execute()
        )
        db_role = profile_resp.data.get("role", "viewer") if profile_resp.data else "viewer"
    except Exception:
        # Fall back to the JWT metadata role if DB lookup fails
        db_role = user.get("role", "viewer")

    if db_role not in ("super_admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    user["role"] = db_role
    return user
