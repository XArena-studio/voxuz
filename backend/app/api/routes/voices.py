from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import Optional
import uuid
from app.core.database import get_db, User, Voice, Verification
from app.core.security import get_current_user, deduct_credits
from app.core.config import settings
from app.services.storage_service import StorageService
from app.services.tts_service import tts_service

router = APIRouter()
storage = StorageService()


class VoiceResponse(BaseModel):
    id: str
    name: str
    is_public: bool
    is_verified: bool
    language: str
    tags: Optional[str]
    owner_email: Optional[str]

    class Config:
        from_attributes = True


@router.post("/clone")
async def clone_voice(
    name: str = Form(..., max_length=100),
    is_public: bool = Form(False),
    tags: Optional[str] = Form(None),
    verification_id: str = Form(...),
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate verification
    result = await db.execute(
        select(Verification).where(
            Verification.id == verification_id,
            Verification.user_id == current_user.id,
            Verification.passed == True,
        )
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise HTTPException(
            status_code=403,
            detail="Tasdiqlash topilmadi. Avval ovozni tasdiqlang.",
        )

    # Only live recording (no mp3 upload)
    allowed_types = ["audio/wav", "audio/webm", "audio/ogg"]
    if audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Faqat live recording qabul qilinadi. MP3 fayl yuklab bo'lmaydi.",
        )

    audio_bytes = await audio.read()
    if len(audio_bytes) < 5000:
        raise HTTPException(status_code=400, detail="Audio namunasi juda qisqa (kamida 3 soniya)")

    # Deduct credits
    cost = settings.CREDITS_PUBLIC_VOICE if is_public else settings.CREDITS_PRIVATE_VOICE
    await deduct_credits(current_user, cost, db)

    # Upload sample to R2
    voice_id = str(uuid.uuid4())
    sample_key = f"voices/{voice_id}/sample.wav"
    sample_url = await storage.upload(audio_bytes, sample_key, content_type="audio/wav")

    # Generate XTTS embedding
    embedding_path = await tts_service.create_embedding(audio_bytes, voice_id)

    # Save voice
    voice = Voice(
        id=voice_id,
        owner_id=current_user.id,
        name=name,
        sample_path=sample_url,
        embedding_path=embedding_path,
        is_public=is_public,
        is_verified=True,
        tags=tags,
    )
    db.add(voice)

    # Bonus credits for public voice
    if is_public:
        current_user.credits += settings.CREDITS_PUBLIC_BONUS

    await db.commit()
    await db.refresh(voice)

    return {
        "voice_id": str(voice.id),
        "name": voice.name,
        "is_public": voice.is_public,
        "credits_remaining": current_user.credits,
        "bonus_applied": settings.CREDITS_PUBLIC_BONUS if is_public else 0,
        "message": "Ovoz muvaffaqiyatli klonlandi!",
    }


@router.get("/")
async def my_voices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Voice).where(Voice.owner_id == current_user.id).order_by(Voice.created_at.desc())
    )
    voices = result.scalars().all()
    return [
        {
            "id": str(v.id),
            "name": v.name,
            "is_public": v.is_public,
            "is_verified": v.is_verified,
            "tags": v.tags,
            "created_at": v.created_at.isoformat(),
        }
        for v in voices
    ]


@router.get("/public")
async def public_voices(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Voice, User).join(User).where(
        Voice.is_public == True,
        Voice.is_verified == True,
    )
    if search:
        query = query.where(
            or_(Voice.name.ilike(f"%{search}%"), Voice.tags.ilike(f"%{search}%"))
        )
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": str(v.id),
            "name": v.name,
            "tags": v.tags,
            "owner": u.email.split("@")[0],  # partial email for privacy
            "sample_url": v.sample_path,
        }
        for v, u in rows
    ]


@router.delete("/{voice_id}")
async def delete_voice(
    voice_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Voice).where(Voice.id == voice_id, Voice.owner_id == current_user.id)
    )
    voice = result.scalar_one_or_none()
    if not voice:
        raise HTTPException(status_code=404, detail="Ovoz topilmadi")

    await db.delete(voice)
    await db.commit()
    return {"message": "Ovoz o'chirildi"}
