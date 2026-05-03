"""
Users API routes - Admin user management.
Uses service role key to bypass RLS for updating other users' profiles.
"""
import logging
from typing import Any, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from app.core.supabase import get_supabase_admin
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
