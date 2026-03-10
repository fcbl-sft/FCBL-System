"""
Vercel Serverless Function - Standalone FastAPI API.
"""
import os
from typing import Any, Dict
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# =============================================================================
# FastAPI App - Initialize first before any potential import errors
# =============================================================================

app = FastAPI(
    title="FCBL Production API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS - Allow all origins for now
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Lazy Supabase Import (to catch import errors gracefully)
# =============================================================================

_supabase_client = None
_supabase_error = None

def get_supabase():
    """Get Supabase client with lazy initialization."""
    global _supabase_client, _supabase_error
    
    if _supabase_error:
        raise Exception(_supabase_error)
    
    if _supabase_client is None:
        try:
            from supabase import create_client
            url = os.environ.get("SUPABASE_URL", "https://zilbigcueizkfvvpuwjp.supabase.co")
            key = os.environ.get("SUPABASE_ANON_KEY", "")
            if not key:
                _supabase_error = "SUPABASE_ANON_KEY environment variable is not set"
                raise Exception(_supabase_error)
            _supabase_client = create_client(url, key)
        except ImportError as e:
            _supabase_error = f"Failed to import supabase: {str(e)}"
            raise Exception(_supabase_error)
        except Exception as e:
            _supabase_error = str(e)
            raise
    
    return _supabase_client

# =============================================================================
# Data Mapping Helpers
# =============================================================================

def map_to_db(data: Dict[str, Any]) -> Dict[str, Any]:
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

def map_from_db(row: Dict[str, Any]) -> Dict[str, Any]:
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

# =============================================================================
# API Routes
# =============================================================================

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    supabase_key = os.environ.get("SUPABASE_ANON_KEY", "")
    return {
        "status": "healthy",
        "version": "1.0.0",
        "supabase_configured": bool(supabase_key),
        "supabase_url": os.environ.get("SUPABASE_URL", "not set")[:50],
    }

@app.get("/api/v1/styles")
async def list_styles():
    """Get all styles/projects."""
    try:
        supabase = get_supabase()
        response = supabase.table("projects")\
            .select("*")\
            .order("updated_at", desc=True)\
            .execute()
        return {"data": [map_from_db(row) for row in response.data], "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/styles/{style_id}")
async def get_style(style_id: str):
    """Get a single style/project by ID."""
    try:
        supabase = get_supabase()
        response = supabase.table("projects")\
            .select("*")\
            .eq("id", style_id)\
            .execute()
        if response.data:
            return {"data": map_from_db(response.data[0]), "error": None}
        raise HTTPException(status_code=404, detail=f"Style {style_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/styles")
async def create_style(request: Request):
    """Create a new style/project."""
    try:
        data = await request.json()
        supabase = get_supabase()
        project_id = f"proj-{int(datetime.now().timestamp() * 1000)}"
        now = datetime.now().isoformat()
        
        db_data = map_to_db(data)
        db_data["id"] = project_id
        db_data["updated_at"] = now
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
        
        response = supabase.table("projects").insert(db_data).execute()
        if response.data:
            return {"data": map_from_db(response.data[0]), "error": None}
        raise Exception("Failed to create project")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/styles/{style_id}")
async def update_style_put(style_id: str, request: Request):
    """Update a style/project (PUT)."""
    return await _update_style(style_id, request)

@app.patch("/api/v1/styles/{style_id}")
async def update_style_patch(style_id: str, request: Request):
    """Update a style/project (PATCH)."""
    return await _update_style(style_id, request)

async def _update_style(style_id: str, request: Request):
    """Update a style/project."""
    try:
        data = await request.json()
        supabase = get_supabase()
        db_data = map_to_db(data)
        db_data["updated_at"] = datetime.now().isoformat()
        
        response = supabase.table("projects")\
            .update(db_data)\
            .eq("id", style_id)\
            .execute()
        
        if response.data:
            return {"data": map_from_db(response.data[0]), "error": None}
        raise HTTPException(status_code=404, detail=f"Style {style_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/styles/{style_id}")
async def delete_style(style_id: str):
    """Delete a style/project."""
    try:
        supabase = get_supabase()
        response = supabase.table("projects")\
            .delete()\
            .eq("id", style_id)\
            .execute()
        if response.data:
            return {"message": "Style deleted successfully", "error": None}
        raise HTTPException(status_code=404, detail=f"Style {style_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Vercel handler
handler = app
