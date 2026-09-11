from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import random
import difflib
from datetime import datetime, timedelta, timezone
from app.core.database import get_db, User, Verification
from app.core.security import get_current_user
from app.core.redis import cache_verification, get_cached_verification, delete_cached_verification
from app.core.config import settings
from app.services.whisper_service import WhisperService

router = APIRouter()
whisper = WhisperService()

# Dynamic text generator — 3 random elements for uniqueness
DATES_UZ = [
    "Bugun {day}-{month} {year}-yil.",
    "Hozirgi sana: {day}.{month}.{year}.",
]
MONTHS_UZ = [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"
]
CONSENT_SENTENCES = [
    "Men ushbu ovozni VoxUz platformasida ishlatishga roziman.",
    "Ushbu ovoz menga tegishli va uni o'zim taqdim etmoqdaman.",
    "Ovozimdan platformada foydalanishga ruxsat beraman.",
]


def generate_verification_text() -> str:
    now = datetime.now()
    code = random.randint(1000, 9999)
    date_template = random.choice(DATES_UZ)
    date_str = date_template.format(
        day=now.day,
        month=MONTHS_UZ[now.month - 1],
        year=now.year,
    )
    consent = random.choice(CONSENT_SENTENCES)
    return f"{date_str} Tasdiqlash kodi: {code}. {consent}"


@router.get("/text")
async def get_verification_text(
    current_user: User = Depends(get_current_user),
):
    text = generate_verification_text()
    await cache_verification(str(current_user.id), text)
    return {
        "text": text,
        "expires_in_seconds": settings.VERIFICATION_EXPIRE_SECONDS,
        "instruction": "Ushbu matnni aniq o'qing va yozing",
    }


@router.post("/verify")
async def verify_recording(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get cached verification text
    expected_text = await get_cached_verification(str(current_user.id))
    if not expected_text:
        raise HTTPException(
            status_code=400,
            detail="Tasdiqlash matni topilmadi yoki muddati o'tgan. Iltimos qaytadan oling.",
        )

    # Validate audio
    if audio.content_type not in ["audio/wav", "audio/webm", "audio/ogg", "audio/mp4"]:
        raise HTTPException(status_code=400, detail="Faqat live recording qabul qilinadi (wav/webm/ogg)")

    content = await audio.read()
    if len(content) < 1000:
        raise HTTPException(status_code=400, detail="Audio fayl juda qisqa")

    # Transcribe with Whisper
    transcript = await whisper.transcribe(content, language="uz")
    if not transcript:
        raise HTTPException(status_code=422, detail="Ovozni aniqlab bo'lmadi")

    # Similarity check
    similarity = difflib.SequenceMatcher(
        None,
        expected_text.lower().strip(),
        transcript.lower().strip(),
    ).ratio()

    passed = similarity >= settings.VERIFICATION_SIMILARITY_THRESHOLD

    # Save to DB
    verification = Verification(
        user_id=current_user.id,
        verification_text=expected_text,
        transcript=transcript,
        similarity_score=similarity,
        passed=passed,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.VERIFICATION_EXPIRE_SECONDS),
    )
    db.add(verification)
    await db.commit()
    await db.refresh(verification)

    # Clean up cache
    await delete_cached_verification(str(current_user.id))

    if not passed:
        raise HTTPException(
            status_code=422,
            detail=f"O'xshashlik juda past: {similarity:.1%}. Matnni aniqroq o'qing.",
        )

    return {
        "verified": True,
        "similarity": round(similarity, 3),
        "transcript": transcript,
        "verification_id": str(verification.id),
        "message": "Ovoz muvaffaqiyatli tasdiqlandi!",
    }
