from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import uuid
from app.core.database import get_db, User, Voice, Generation
from app.core.security import get_current_user, deduct_credits
from app.core.redis import enqueue_generation, get_job_status, set_job_status
from app.core.config import settings

router = APIRouter()


class GenerateRequest(BaseModel):
    text: str
    voice_id: str


@router.post("/")
async def generate_audio(
    req: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate text length
    if len(req.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Matn bo'sh bo'lmasin")
    if len(req.text) > settings.MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Matn {settings.MAX_TEXT_LENGTH} belgidan oshmasin",
        )

    # Validate voice access
    result = await db.execute(
        select(Voice).where(
            Voice.id == req.voice_id,
            Voice.is_verified == True,
        )
    )
    voice = result.scalar_one_or_none()
    if not voice:
        raise HTTPException(status_code=404, detail="Ovoz topilmadi")

    # Check ownership or public access
    if voice.owner_id != current_user.id and not voice.is_public:
        raise HTTPException(status_code=403, detail="Bu ovozga ruxsatingiz yo'q")

    # Deduct credits
    await deduct_credits(current_user, settings.CREDITS_GENERATE, db)

    # Create generation record
    gen_id = str(uuid.uuid4())
    generation = Generation(
        id=gen_id,
        user_id=current_user.id,
        voice_id=voice.id,
        text=req.text,
        status="pending",
    )
    db.add(generation)
    await db.commit()

    # Enqueue to Redis
    await enqueue_generation(gen_id, {
        "voice_id": str(voice.id),
        "embedding_path": voice.embedding_path,
        "sample_path": voice.sample_path,
        "text": req.text,
        "language": voice.language,
        "user_id": str(current_user.id),
    })

    # Set initial job status in Redis
    await set_job_status(gen_id, "queued")

    return {
        "generation_id": gen_id,
        "status": "queued",
        "credits_remaining": current_user.credits,
        "message": "Audio yaratish navbatga qo'shildi",
    }


@router.get("/{generation_id}")
async def get_generation_status(
    generation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # First check Redis for fast response
    job = await get_job_status(generation_id)
    if job and job.get("status") in ("queued", "processing"):
        return {"generation_id": generation_id, **job}

    # Fall back to DB
    result = await db.execute(
        select(Generation).where(
            Generation.id == generation_id,
            Generation.user_id == current_user.id,
        )
    )
    generation = result.scalar_one_or_none()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation topilmadi")

    return {
        "generation_id": str(generation.id),
        "status": generation.status,
        "output_url": generation.output_path,
        "text": generation.text,
        "created_at": generation.created_at.isoformat(),
    }


@router.get("/history/me")
async def generation_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Generation).where(Generation.user_id == current_user.id)
        .order_by(Generation.created_at.desc()).limit(50)
    )
    gens = result.scalars().all()
    return [
        {
            "id": str(g.id),
            "status": g.status,
            "output_url": g.output_path,
            "text_preview": g.text[:80] + "..." if len(g.text) > 80 else g.text,
            "created_at": g.created_at.isoformat(),
        }
        for g in gens
    ]
