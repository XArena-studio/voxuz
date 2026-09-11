import asyncio
import tempfile
import os
from app.core.config import settings


class WhisperService:
    def __init__(self):
        self.model = None

    def _load(self):
        if self.model is None:
            import whisper
            self.model = whisper.load_model(settings.WHISPER_MODEL)
            print(f"[Whisper] Model yuklandi: {settings.WHISPER_MODEL}")

    async def transcribe(self, audio_bytes: bytes, language: str = "uz") -> str | None:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._transcribe_sync, audio_bytes, language)

    def _transcribe_sync(self, audio_bytes: bytes, language: str) -> str | None:
        self._load()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            result = self.model.transcribe(tmp_path, language=language, fp16=False)
            return result.get("text", "").strip()
        except Exception as e:
            print(f"[Whisper] Xato: {e}")
            return None
        finally:
            os.unlink(tmp_path)
