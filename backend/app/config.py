"""
Application configuration settings.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase Configuration (MUST be set via environment variables)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    # Service role key - bypasses RLS (keep secret, server-side only)
    supabase_service_role_key: str = ""
    
    # Google AI Configuration
    google_api_key: str = ""
    
    # CORS Configuration
    frontend_url: str = "http://localhost:5173"
    
    # API Configuration
    api_v1_prefix: str = "/api/v1"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
