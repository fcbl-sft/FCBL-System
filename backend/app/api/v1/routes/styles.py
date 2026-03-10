"""
Styles/Projects API routes.
"""
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, Depends

from app.core.supabase import get_supabase
from app.services.project_service import ProjectService

router = APIRouter(prefix="/styles", tags=["styles"])


def get_project_service():
    """Dependency to get project service."""
    supabase = get_supabase()
    return ProjectService(supabase)


@router.get("")
async def list_styles(service: ProjectService = Depends(get_project_service)):
    """
    Get all styles/projects.
    Returns list ordered by updated_at descending.
    """
    try:
        projects = await service.get_all()
        return {"data": projects, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{style_id}")
async def get_style(
    style_id: str,
    service: ProjectService = Depends(get_project_service)
):
    """Get a single style/project by ID."""
    try:
        project = await service.get_by_id(style_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"Style {style_id} not found")
        return {"data": project, "error": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_style(
    data: Dict[str, Any],
    service: ProjectService = Depends(get_project_service)
):
    """Create a new style/project."""
    try:
        project = await service.create(data)
        return {"data": project, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{style_id}")
async def update_style(
    style_id: str,
    data: Dict[str, Any],
    service: ProjectService = Depends(get_project_service)
):
    """Update a style/project (full update)."""
    try:
        project = await service.update(style_id, data)
        return {"data": project, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{style_id}")
async def partial_update_style(
    style_id: str,
    data: Dict[str, Any],
    service: ProjectService = Depends(get_project_service)
):
    """Partially update a style/project."""
    try:
        project = await service.update(style_id, data)
        return {"data": project, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{style_id}")
async def delete_style(
    style_id: str,
    service: ProjectService = Depends(get_project_service)
):
    """Delete a style/project."""
    try:
        success = await service.delete(style_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Style {style_id} not found")
        return {"message": "Style deleted successfully", "error": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
