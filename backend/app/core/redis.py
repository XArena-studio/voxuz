import redis.asyncio as aioredis
import json
from app.core.config import settings

redis_client: aioredis.Redis | None = None


async def init_redis():
    global redis_client
    redis_client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> aioredis.Redis:
    return redis_client


# Queue helpers
GENERATION_QUEUE = "voxuz:generation_queue"
JOB_PREFIX = "voxuz:job:"


async def enqueue_generation(job_id: str, payload: dict) -> None:
    await redis_client.rpush(GENERATION_QUEUE, json.dumps({"job_id": job_id, **payload}))


async def set_job_status(job_id: str, status: str, result: dict | None = None) -> None:
    data = {"status": status}
    if result:
        data.update(result)
    await redis_client.setex(f"{JOB_PREFIX}{job_id}", 3600, json.dumps(data))


async def get_job_status(job_id: str) -> dict | None:
    data = await redis_client.get(f"{JOB_PREFIX}{job_id}")
    return json.loads(data) if data else None


# Verification text caching (60s expiry)
VERIFICATION_PREFIX = "voxuz:verify:"


async def cache_verification(user_id: str, text: str) -> None:
    await redis_client.setex(
        f"{VERIFICATION_PREFIX}{user_id}",
        settings.VERIFICATION_EXPIRE_SECONDS,
        text,
    )


async def get_cached_verification(user_id: str) -> str | None:
    return await redis_client.get(f"{VERIFICATION_PREFIX}{user_id}")


async def delete_cached_verification(user_id: str) -> None:
    await redis_client.delete(f"{VERIFICATION_PREFIX}{user_id}")
