"""
Application configuration settings.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase Configuration
    supabase_url: str = "https://zilbigcueizkfvvpuwjp.supabase.co"
    supabase_anon_key: str = "sb_publishable_uSaP-URx2fUnvoWgMrL7-g_zEnamxgY"
    
    # Google AI Configuration
    google_api_key: str = ""
    
    # CORS Configuration
    frontend_url: str = "http://localhost:5173"
    
    # API Configuration
    api_v1_prefix: str = "/api/v1"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
