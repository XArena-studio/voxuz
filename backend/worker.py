"""
worker.py — Alohida jarayon sifatida ishga tushiriladi:
    python worker.py

Redis queue'dan job oladi → XTTS bilan audio yaratadi → R2'ga yuklaydi → DB yangilaydi
"""
import asyncio
import json
import tempfile
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.redis import init_redis, GENERATION_QUEUE, set_job_status
from app.services.tts_service import tts_service
from app.services.storage_service import StorageService

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import update
from app.core.database import Generation, Base

engine = create_async_engine(settings.DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
storage = StorageService()


async def process_job(job: dict):
    gen_id = job["job_id"]
    print(f"[Worker] Job boshlandi: {gen_id}")

    await set_job_status(gen_id, "processing")

    # Update DB status
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Generation).where(Generation.id == gen_id).values(status="processing")
        )
        await db.commit()

    try:
        # Download sample from R2 for speaker reference
        sample_path = job.get("sample_path", "")

        # Generate in temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_out:
            output_path = tmp_out.name

        # Run XTTS
        await tts_service.generate(
            text=job["text"],
            speaker_wav=sample_path,
            language=job.get("language", "uz"),
            output_path=output_path,
        )

        # Upload output to R2
        with open(output_path, "rb") as f:
            audio_bytes = f.read()

        r2_key = f"outputs/{gen_id}/audio.wav"
        output_url = await storage.upload(audio_bytes, r2_key, content_type="audio/wav")

        os.unlink(output_path)

        # Update DB: done
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Generation)
                .where(Generation.id == gen_id)
                .values(status="done", output_path=output_url)
            )
            await db.commit()

        await set_job_status(gen_id, "done", {"output_url": output_url})
        print(f"[Worker] Job tugadi: {gen_id}")

    except Exception as e:
        print(f"[Worker] Xato ({gen_id}): {e}")
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Generation).where(Generation.id == gen_id).values(status="failed")
            )
            await db.commit()
        await set_job_status(gen_id, "failed", {"error": str(e)})


async def main():
    print("[Worker] Ishga tushdi. XTTS model yuklanmoqda...")
    await tts_service.warmup()

    redis = await aioredis.from_url("redis://127.0.0.1:6379", decode_responses=True)
    print(f"[Worker] Queue kutilmoqda: {GENERATION_QUEUE}")

    while True:
        try:
            # Blocking pop — 5s timeout
            result = await redis.blpop(GENERATION_QUEUE, timeout=5)
            if result:
                _, raw = result
                job = json.loads(raw)
                await process_job(job)
        except Exception as e:
            print(f"[Worker] Queue xatosi: {e}")
            await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())
