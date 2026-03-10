"""
Project service - Business logic for project/style operations.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from supabase import Client


class ProjectService:
    """Service for project CRUD operations."""

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.table = "projects"

    def _map_to_db(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Map camelCase keys to snake_case for database."""
        mapping = {
            "poNumbers": "po_numbers",
            "updatedAt": "updated_at",
            "techPackFiles": "tech_pack_files",
            "ppMeetings": "pp_meetings",
            "materialControl": "material_control",
            "orderSheet": "order_sheet",
            "materialRemarks": "material_remarks",
            "materialAttachments": "material_attachments",
            "materialComments": "material_comments",
            "productImage": "product_image",
            "productColors": "product_colors",
        }
        result = {}
        for key, value in data.items():
            db_key = mapping.get(key, key)
            if value is not None:
                result[db_key] = value
        return result

    def _map_from_db(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Map snake_case keys from database to camelCase."""
        return {
            "id": row.get("id"),
            "title": row.get("title"),
            "productImage": row.get("product_image"),
            "productColors": row.get("product_colors", []),
            "poNumbers": row.get("po_numbers", []),
            "updatedAt": row.get("updated_at"),
            "status": row.get("status"),
            "techPackFiles": row.get("tech_pack_files", []),
            "pages": row.get("pages", []),
            "comments": row.get("comments", []),
            "inspections": row.get("inspections", []),
            "ppMeetings": row.get("pp_meetings", []),
            "materialControl": row.get("material_control", []),
            "invoices": row.get("invoices", []),
            "packing": row.get("packing"),
            "orderSheet": row.get("order_sheet"),
            "consumption": row.get("consumption"),
            "materialRemarks": row.get("material_remarks", ""),
            "materialAttachments": row.get("material_attachments", []),
            "materialComments": row.get("material_comments", []),
        }

    async def get_all(self) -> List[Dict[str, Any]]:
        """Get all projects ordered by updated_at descending."""
        response = self.supabase.table(self.table)\
            .select("*")\
            .order("updated_at", desc=True)\
            .execute()
        return [self._map_from_db(row) for row in response.data]

    async def get_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get a single project by ID."""
        response = self.supabase.table(self.table)\
            .select("*")\
            .eq("id", project_id)\
            .execute()
        if response.data:
            return self._map_from_db(response.data[0])
        return None

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new project."""
        # Generate ID and timestamp
        project_id = f"proj-{int(datetime.now().timestamp() * 1000)}"
        now = datetime.now().isoformat()

        db_data = self._map_to_db(data)
        db_data["id"] = project_id
        db_data["updated_at"] = now

        # Set defaults
        db_data.setdefault("status", "DRAFT")
        db_data.setdefault("po_numbers", [])
        db_data.setdefault("tech_pack_files", [])
        db_data.setdefault("pages", [])
        db_data.setdefault("comments", [])
        db_data.setdefault("inspections", [])
        db_data.setdefault("pp_meetings", [])
        db_data.setdefault("material_control", [])
        db_data.setdefault("invoices", [])
        db_data.setdefault("material_remarks", "")
        db_data.setdefault("material_attachments", [])
        db_data.setdefault("material_comments", [])

        response = self.supabase.table(self.table).insert(db_data).execute()
        if response.data:
            return self._map_from_db(response.data[0])
        raise Exception("Failed to create project")

    async def update(self, project_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a project."""
        db_data = self._map_to_db(data)
        db_data["updated_at"] = datetime.now().isoformat()

        response = self.supabase.table(self.table)\
            .update(db_data)\
            .eq("id", project_id)\
            .execute()

        if response.data:
            return self._map_from_db(response.data[0])
        raise Exception(f"Project {project_id} not found")

    async def delete(self, project_id: str) -> bool:
        """Delete a project."""
        response = self.supabase.table(self.table)\
            .delete()\
            .eq("id", project_id)\
            .execute()
        return len(response.data) > 0
