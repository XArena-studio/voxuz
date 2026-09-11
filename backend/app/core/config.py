from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_NAME: str = "VoxUz"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/voxuz"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    SECRET_KEY: str = "change-this-in-production-very-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Cloudflare R2
    R2_ENDPOINT: str = ""
    R2_ACCESS_KEY: str = ""
    R2_SECRET_KEY: str = ""
    R2_BUCKET: str = "voxuz-audio"

    # XTTS
    XTTS_MODEL_PATH: str = "tts_models/multilingual/multi-dataset/xtts_v2"
    GPU_ENABLED: bool = True

    # Whisper
    WHISPER_MODEL: str = "small"  # tiny, base, small, medium, large

    # Credits
    CREDITS_ON_REGISTER: int = 100
    CREDITS_PRIVATE_VOICE: int = 10
    CREDITS_PUBLIC_VOICE: int = 3
    CREDITS_GENERATE: int = 1
    CREDITS_PUBLIC_BONUS: int = 50

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:4000", "http://127.0.0.1:4000", "https://voxuz.uz"]
        
    # Verification
    VERIFICATION_EXPIRE_SECONDS: int = 60
    VERIFICATION_SIMILARITY_THRESHOLD: float = 0.85

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 30
    MAX_AUDIO_DURATION_SECONDS: int = 30
    MAX_TEXT_LENGTH: int = 500

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
