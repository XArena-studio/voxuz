from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db
from app.core.redis import init_redis
from app.api.routes import auth, voices, generation, verification
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_redis()
    # XTTS model warmup (once at startup)
    from app.services.tts_service import tts_service
    await tts_service.warmup()
    yield

app = FastAPI(
    title="VoxUz API",
    description="Uzbek AI Voice Cloning Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(voices.router, prefix="/api/v1/voices", tags=["voices"])
app.include_router(generation.router, prefix="/api/v1/generation", tags=["generation"])
app.include_router(verification.router, prefix="/api/v1/verification", tags=["verification"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "VoxUz API"}
