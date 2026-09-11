import boto3
from botocore.config import Config
from app.core.config import settings


class StorageService:
    def __init__(self):
        self.client = None
        self.bucket = settings.R2_BUCKET
        # R2 sozlanmagan bo'lsa skip qilamiz
        if settings.R2_ENDPOINT and settings.R2_ACCESS_KEY:
            try:
                self.client = boto3.client(
                    "s3",
                    endpoint_url=settings.R2_ENDPOINT,
                    aws_access_key_id=settings.R2_ACCESS_KEY,
                    aws_secret_access_key=settings.R2_SECRET_KEY,
                    config=Config(signature_version="s3v4"),
                    region_name="auto",
                )
            except Exception as e:
                print(f"[R2] Ulanib bo'lmadi: {e}")

    async def upload(self, data: bytes, key: str, content_type: str = "audio/wav") -> str:
        if not self.client:
            # R2 yo'q — local path qaytaramiz
            return f"/local/{key}"
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._upload_sync, data, key, content_type)
        return f"{settings.R2_ENDPOINT}/{self.bucket}/{key}"

    def _upload_sync(self, data: bytes, key: str, content_type: str):
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    async def get_presigned_url(self, key: str, expires: int = 3600) -> str:
        if not self.client:
            return f"/local/{key}"
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._presign_sync, key, expires)

    def _presign_sync(self, key: str, expires: int) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )

    async def delete(self, key: str):
        if not self.client:
            return
        import asyncio
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: self.client.delete_object(Bucket=self.bucket, Key=key),
        )