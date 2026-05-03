"""
Pydantic models for user management API endpoints.
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, field_validator


class CreateUserRequest(BaseModel):
    """Request body for creating a new user via the Admin API."""
    email: EmailStr
    password: str
    name: str
    role: str = "viewer"
    phone: Optional[str] = None
    factory_id: Optional[str] = None
    section_access: Optional[Dict[str, Any]] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c in '!@#$%^&*(),.?":{}|<>' for c in v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"super_admin", "admin", "director", "merchandiser", "qc", "viewer"}
        if v not in allowed:
            raise ValueError(f"Invalid role. Must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()
