from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import documents

# Creates tables if they don't exist yet.
# For production/team workflows, prefer Alembic migrations instead.
Base.metadata.create_all(bind=engine)

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
