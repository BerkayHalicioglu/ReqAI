import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic.config import Config
from alembic import command

from app.database import Base, engine
from app.routers import documents

def run_migrations():
    """Run Alembic database migrations programmatically on application startup."""
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        alembic_ini_path = os.path.join(base_dir, "alembic.ini")
        if os.path.exists(alembic_ini_path):
            alembic_cfg = Config(alembic_ini_path)
            alembic_cfg.set_main_option("script_location", os.path.join(base_dir, "alembic"))
            # Fallback to create_all if alembic tables haven't been created
            Base.metadata.create_all(bind=engine)
            # Apply any pending Alembic migrations
            command.upgrade(alembic_cfg, "head")
            print("Alembic database migrations applied successfully.")
        else:
            Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Alembic migration notice: {e}")
        Base.metadata.create_all(bind=engine)

run_migrations()

app = FastAPI(
    title="ReqAI API",
    description="AI-Powered Requirement Decomposition Platform",
    version="0.1.0",
)

# Allow the Angular dev server to call this API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "service": "ReqAI API"}
