# Re-export get_db from app.core.database for convenience
# This file exists so routers import from one place: 
# from app.dependencies.database import get_db

from app.core.database import get_db

__all__ = ["get_db"]