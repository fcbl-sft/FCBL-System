"""
Users API routes - Admin user management.
Uses service role key to bypass RLS for updating other users' profiles.
"""
from typing import Any, Dict
from fastapi import APIRouter, HTTPException

from app.core.supabase import get_supabase_admin

router = APIRouter(prefix="/users", tags=["users"])


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
        from datetime import datetime, timezone
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        response = supabase.from_("profiles").update(update_data).eq("id", user_id).execute()

        if hasattr(response, "error") and response.error:
            raise HTTPException(status_code=400, detail=str(response.error))

        return {"success": True, "error": None}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
