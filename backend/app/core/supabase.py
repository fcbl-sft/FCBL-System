"""
Supabase client configuration.
"""
from functools import lru_cache
from supabase import create_client, Client

from app.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """Get cached Supabase client instance (anon key - subject to RLS)."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase() -> Client:
    """Dependency injection for Supabase client."""
    return get_supabase_client()


def get_supabase_admin() -> Client:
    """Get Supabase client with service role key - bypasses RLS. Use only in trusted server-side code."""
    settings = get_settings()
    key = settings.supabase_service_role_key
    if not key or key == "YOUR_SERVICE_ROLE_KEY_HERE":
        raise RuntimeError(
            "SUPABASE_SERVICE_ROLE_KEY is not configured. "
            "Set it in backend/.env with the service_role key from your Supabase dashboard: "
            "https://supabase.com/dashboard/project/zilbigcueizkfvvpuwjp/settings/api"
        )
    return create_client(settings.supabase_url, key)
