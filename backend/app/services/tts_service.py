import asyncio
import tempfile
import os
from pathlib import Path
from app.core.config import settings

class TTSService:
    def __init__(self):
        self.model = None
        self.device = "cuda" if settings.GPU_ENABLED else "cpu"

    async def warmup(self):
        """Load XTTS model once at startup — never reload per request"""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._load_model)
        print(f"[XTTS] Model yuklandi: {self.device}")

    def _load_model(self):
        try:
            from TTS.api import TTS
            self.model = TTS(settings.XTTS_MODEL_PATH).to(self.device)
            if settings.GPU_ENABLED:
                import torch
                # fp16 for faster GPU inference
                self.model = self.model.half()
        except Exception as e:
            print(f"[XTTS] Model yuklanmadi: {e}")
            self.model = None

    async def create_embedding(self, audio_bytes: bytes, voice_id: str) -> str | None:
        """Create speaker embedding from audio sample"""
        if not self.model:
            return None

        loop = asyncio.get_event_loop()
        embedding_path = f"backend/voices/{voice_id}/embedding.npy"
        os.makedirs(f"backend/voices/{voice_id}", exist_ok=True)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            await loop.run_in_executor(None, self._save_embedding, tmp_path, embedding_path)
        finally:
            os.unlink(tmp_path)

        return embedding_path

    def _save_embedding(self, wav_path: str, out_path: str):
        try:
            import numpy as np
            gpt_cond, speaker = self.model.synthesizer.tts_model.get_conditioning_latents(
                audio_path=[wav_path]
            )
            np.save(out_path, {
                "gpt_cond_latent": gpt_cond.cpu().numpy(),
                "speaker_embedding": speaker.cpu().numpy(),
            })
        except Exception as e:
            print(f"[XTTS] Embedding yaratishda xato: {e}")

    async def generate(
        self,
        text: str,
        speaker_wav: str,
        language: str = "uz",
        output_path: str = None,
    ) -> str | None:
        """Generate speech from text using speaker wav"""
        if not self.model:
            raise RuntimeError("XTTS model yuklanmagan")

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._generate_sync, text, speaker_wav, language, output_path
        )

    def _generate_sync(self, text: str, speaker_wav: str, language: str, output_path: str) -> str:
        try:
            self.model.tts_to_file(
                text=text,
                speaker_wav=speaker_wav,
                language=language,
                file_path=output_path,
            )
            return output_path
        except Exception as e:
            print(f"[XTTS] Generation xatosi: {e}")
            raise


tts_service = TTSService()
