"""
Users API routes - Admin user management.
Uses service role key to bypass RLS for updating other users' profiles.
"""
import logging
from typing import Any, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from app.core.supabase import get_supabase_admin
from app.config import get_settings
from app.models.user_models import CreateUserRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

# Default section access per role (mirrors frontend permissionConstants.ts)
DEFAULT_ROLE_ACCESS = {
    "super_admin": {
        "dashboard": "full", "summary": "full", "tech_pack": "full",
        "order_sheet": "full", "consumption": "full", "pp_meeting": "full",
        "mq_control": "full", "commercial": "full", "qc_inspect": "full",
        "user_management": "full", "role_management": "full",
    },
    "admin": {
        "dashboard": "full", "summary": "full", "tech_pack": "full",
        "order_sheet": "full", "consumption": "full", "pp_meeting": "full",
        "mq_control": "full", "commercial": "full", "qc_inspect": "full",
        "user_management": "full", "role_management": "none",
    },
    "director": {
        "dashboard": "full", "summary": "full", "tech_pack": "full",
        "order_sheet": "full", "consumption": "full", "pp_meeting": "full",
        "mq_control": "full", "commercial": "full", "qc_inspect": "full",
        "user_management": "none", "role_management": "none",
    },
    "merchandiser": {
        "dashboard": "full", "summary": "full", "tech_pack": "full",
        "order_sheet": "full", "consumption": "full", "pp_meeting": "full",
        "mq_control": "none", "commercial": "full", "qc_inspect": "none",
        "user_management": "none", "role_management": "none",
    },
    "qc": {
        "dashboard": "full", "summary": "full", "tech_pack": "none",
        "order_sheet": "none", "consumption": "none", "pp_meeting": "full",
        "mq_control": "full", "commercial": "none", "qc_inspect": "full",
        "user_management": "none", "role_management": "none",
    },
    "viewer": {
        "dashboard": "full", "summary": "full", "tech_pack": "view",
        "order_sheet": "view", "consumption": "view", "pp_meeting": "view",
        "mq_control": "view", "commercial": "view", "qc_inspect": "view",
        "user_management": "none", "role_management": "none",
    },
}


@router.post("/")
async def create_user(data: CreateUserRequest):
    """
    Create a new user via Supabase Admin API.
    Uses service role key to call auth.admin.create_user().
    Creates the auth user AND the profiles row in one endpoint.
    """
    try:
        supabase = get_supabase_admin()

        # 1. Create auth user via Admin API
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": data.email,
                "password": data.password,
                "email_confirm": True,  # Auto-confirm so user can log in immediately
                "user_metadata": {
                    "full_name": data.name,
                    "role": data.role,
                },
            })
        except Exception as auth_err:
            error_msg = str(auth_err)
            logger.error(f"Supabase auth.admin.create_user() failed: {error_msg}")
            logger.error(f"Full exception: {repr(auth_err)}")
            # Handle common Supabase auth errors
            if "already been registered" in error_msg.lower() or "already exists" in error_msg.lower():
                raise HTTPException(status_code=409, detail="A user with this email already exists")
            if "invalid" in error_msg.lower() and "email" in error_msg.lower():
                raise HTTPException(status_code=400, detail="Invalid email format")
            if "database error" in error_msg.lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Database trigger error creating user. "
                           f"Please run the latest migration (006_fix_handle_new_user_trigger.sql) "
                           f"in your Supabase SQL Editor. Raw error: {error_msg}"
                )
            raise HTTPException(status_code=400, detail=f"Failed to create auth user: {error_msg}")

        new_user = auth_response.user
        if not new_user:
            raise HTTPException(status_code=500, detail="Auth user creation returned no user")

        new_user_id = new_user.id

        # 2. Build section access: use custom if provided, otherwise role defaults
        section_access = data.section_access if data.section_access else DEFAULT_ROLE_ACCESS.get(data.role, DEFAULT_ROLE_ACCESS["viewer"])

        # 3. Upsert profile (the handle_new_user trigger may have already created a row)
        profile_data = {
            "id": new_user_id,
            "email": data.email,
            "name": data.name,
            "role": data.role,
            "phone": data.phone,
            "factory_id": data.factory_id,
            "section_access": section_access,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        profile_response = (
            supabase.from_("profiles")
            .upsert(profile_data, on_conflict="id")
            .execute()
        )

        # 4. Fetch and return the created profile
        fetch_response = (
            supabase.from_("profiles")
            .select("*")
            .eq("id", new_user_id)
            .single()
            .execute()
        )

        return {
            "user": fetch_response.data,
            "error": None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{user_id}")
async def update_user_profile(user_id: str, data: Dict[str, Any]):
    """
    Update a user's profile (role, section_access, name, etc.).
    Uses service role client to bypass RLS - admin only operation.
    """
    try:
        supabase = get_supabase_admin()

        # Only allow safe fields to be updated via this endpoint
        allowed_fields = {"name", "role", "section_access", "is_active", "phone", "factory_id", "profile_photo_url"}
        update_data = {k: v for k, v in data.items() if k in allowed_fields}

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        # Add updated_at timestamp
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        response = supabase.from_("profiles").update(update_data).eq("id", user_id).execute()

        if hasattr(response, "error") and response.error:
            raise HTTPException(status_code=400, detail=str(response.error))

        return {"success": True, "error": None}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}")
async def delete_user(user_id: str):
    """
    Permanently hard-delete a user from auth.users and profiles.

    Uses a direct HTTP DELETE to the Supabase Admin REST API via httpx
    (with the service_role key as Bearer token) to guarantee a true hard
    delete.  The supabase-py auth.admin.delete_user() helper performs a
    soft-delete (sets banned_until / deleted_at) in supabase-py v2, which
    is why the user was still visible after calling it.
    """
    import httpx

    settings = get_settings()
    service_role_key = settings.supabase_service_role_key
    supabase_url = settings.supabase_url

    if not service_role_key or service_role_key == "YOUR_SERVICE_ROLE_KEY_HERE":
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_SERVICE_ROLE_KEY is not configured in backend/.env"
        )

    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
        "Content-Type": "application/json",
    }

    try:
        # ── Step 1: Hard-delete from auth.users via Admin REST API ──────────
        admin_delete_url = f"{supabase_url}/auth/v1/admin/users/{user_id}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.delete(admin_delete_url, headers=headers)

        if response.status_code not in (200, 204):
            error_body = response.text
            logger.error(
                f"Supabase Admin API rejected delete for user {user_id}: "
                f"status={response.status_code} body={error_body}"
            )
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to delete auth user: {error_body}",
            )

        logger.info(f"Auth user {user_id} hard-deleted via Admin REST API (status {response.status_code})")

        # ── Step 2: Explicitly delete the profiles row (belt-and-suspenders) ─
        # The FK cascade should handle this, but we do it explicitly to be safe.
        try:
            supabase_admin = get_supabase_admin()
            supabase_admin.from_("profiles").delete().eq("id", user_id).execute()
            logger.info(f"Profile row for {user_id} deleted")
        except Exception as profile_err:
            # Not fatal – cascade may have already removed it
            logger.warning(f"Profile cleanup for {user_id} skipped: {profile_err}")

        return {"success": True, "error": None}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error deleting user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

