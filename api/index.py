"""
Vercel Serverless Function Entry Point for FastAPI Backend.

This file wraps the FastAPI application for Vercel's Python serverless runtime.
All API requests are routed here via vercel.json rewrites.
"""
import sys
from pathlib import Path

# Add backend directory to path so we can import the FastAPI app
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app

# Vercel expects the ASGI app to be named 'app' or 'handler'
handler = app
