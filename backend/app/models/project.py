"""
Pydantic models for Project data.
These mirror the TypeScript types in types.ts.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ============= Basic Types =============

class PONumber(BaseModel):
    id: str
    number: str
    quantity: Optional[int] = None
    delivery_date: Optional[str] = Field(None, alias="deliveryDate")

    class Config:
        populate_by_name = True


class FileAttachment(BaseModel):
    id: str
    file_name: str = Field(alias="fileName")
    file_url: str = Field(alias="fileUrl")
    upload_date: str = Field(alias="uploadDate")

    class Config:
        populate_by_name = True


class Comment(BaseModel):
    id: str
    author: str
    role: str
    text: str
    timestamp: str


class UploadedTechPack(BaseModel):
    id: str
    name: str
    file_url: str = Field(alias="fileUrl")
    upload_date: str = Field(alias="uploadDate")
    file_name: Optional[str] = Field(None, alias="fileName")
    file_type: Optional[str] = Field(None, alias="fileType")
    file_size: Optional[int] = Field(None, alias="fileSize")
    storage_path: Optional[str] = Field(None, alias="storagePath")

    class Config:
        populate_by_name = True


# ============= Project Model =============

class ProjectCreate(BaseModel):
    """Schema for creating a new project."""
    title: str
    po_numbers: List[PONumber] = Field(default_factory=list, alias="poNumbers")
    status: str = "DRAFT"

    class Config:
        populate_by_name = True


class ProjectUpdate(BaseModel):
    """Schema for updating a project (all fields optional)."""
    title: Optional[str] = None
    po_numbers: Optional[List[PONumber]] = Field(None, alias="poNumbers")
    status: Optional[str] = None
    tech_pack_files: Optional[List[Any]] = Field(None, alias="techPackFiles")
    pages: Optional[List[Any]] = None
    comments: Optional[List[Any]] = None
    inspections: Optional[List[Any]] = None
    pp_meetings: Optional[List[Any]] = Field(None, alias="ppMeetings")
    material_control: Optional[List[Any]] = Field(None, alias="materialControl")
    invoices: Optional[List[Any]] = None
    packing: Optional[Dict[str, Any]] = None
    order_sheet: Optional[Dict[str, Any]] = Field(None, alias="orderSheet")
    consumption: Optional[Dict[str, Any]] = None
    material_remarks: Optional[str] = Field(None, alias="materialRemarks")
    material_attachments: Optional[List[Any]] = Field(None, alias="materialAttachments")
    material_comments: Optional[List[Any]] = Field(None, alias="materialComments")

    class Config:
        populate_by_name = True


class Project(BaseModel):
    """Full project model."""
    id: str
    title: str
    po_numbers: List[PONumber] = Field(default_factory=list, alias="poNumbers")
    updated_at: str = Field(alias="updatedAt")
    status: str
    tech_pack_files: List[Any] = Field(default_factory=list, alias="techPackFiles")
    pages: List[Any] = Field(default_factory=list)
    comments: List[Any] = Field(default_factory=list)
    inspections: List[Any] = Field(default_factory=list)
    pp_meetings: List[Any] = Field(default_factory=list, alias="ppMeetings")
    material_control: List[Any] = Field(default_factory=list, alias="materialControl")
    invoices: List[Any] = Field(default_factory=list)
    packing: Optional[Dict[str, Any]] = None
    order_sheet: Optional[Dict[str, Any]] = Field(None, alias="orderSheet")
    consumption: Optional[Dict[str, Any]] = None
    material_remarks: Optional[str] = Field(None, alias="materialRemarks")
    material_attachments: List[Any] = Field(default_factory=list, alias="materialAttachments")
    material_comments: List[Any] = Field(default_factory=list, alias="materialComments")

    class Config:
        populate_by_name = True


# ============= Response Models =============

class ProjectListResponse(BaseModel):
    """Response for list of projects."""
    data: List[Project]
    count: int


class ProjectResponse(BaseModel):
    """Response for single project."""
    data: Project


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True
