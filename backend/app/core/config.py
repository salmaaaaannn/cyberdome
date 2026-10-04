import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CyberDome"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment & Host
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cyberdome-super-secret-jwt-signing-key-2026-production-ready")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database URL: Supports SQLite for zero-setup local dev/testing, or PostgreSQL/Supabase for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./cyberdome.db")
    
    # Supabase credentials (for production integration in Supabase PostgreSQL)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Gemini credentials (for AI Security Copilot)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    # Module 01: Network Anomaly Detection ML
    NETWORK_ML_ENABLED: bool = os.getenv("NETWORK_ML_ENABLED", "true").lower() in ("true", "1", "yes")
    NETWORK_ML_MODEL_VERSION: str = os.getenv("NETWORK_ML_MODEL_VERSION", "v1.0.0-cic-ids2017")
    NETWORK_ML_ARTIFACT_PATH: str = os.getenv("NETWORK_ML_ARTIFACT_PATH", "app/ml_models/network")

    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    model_config = SettingsConfigDict(env_file=["backend/.env", ".env"], extra="allow")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.ENVIRONMENT.lower() == "production":
            default_insecure_key = "cyberdome-super-secret-jwt-signing-key-2026-production-ready"
            if not self.SECRET_KEY or self.SECRET_KEY == default_insecure_key or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "FATAL SECURITY CONFIGURATION: In production ENVIRONMENT, a unique, cryptographically "
                    "secure SECRET_KEY (minimum 32 characters) must be configured in environment variables."
                )

settings = Settings()
