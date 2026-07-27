import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://reqai_user:reqai_pass@localhost:5432/reqai_db"
    USE_MOCK_AI: bool = True
    AI_PROVIDER: str = "mock"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"


settings = Settings()

# Make sure the upload directory exists at startup
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
