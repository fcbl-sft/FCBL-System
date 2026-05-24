"""
FastAPI application entry point.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.api.v1.router import api_router

settings = get_settings()

# Rate limiter — keyed by client IP
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title="FCBL Production API",
    description="Backend API for the Factory Portal - Garment Tech Pack Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Attach limiter to app state so route-level decorators work
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS - dynamically include production URL
allowed_origins = [
    settings.frontend_url,  # Production URL from env var
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# Add Vercel preview deployment URLs pattern
if settings.frontend_url and ".vercel.app" in settings.frontend_url:
    # Also allow preview deployments from the same Vercel project
    base_domain = settings.frontend_url.split(".")[0].replace("https://", "")
    allowed_origins.append(f"https://{base_domain}-*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "apikey"],
)

# Include API routes
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "FCBL Production API",
        "docs": "/docs",
        "health": "/health",
        "api": settings.api_v1_prefix,
    }

