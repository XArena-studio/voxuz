<<<<<<< HEAD
# 🎙 VoxUz — O'zbek AI Ovoz Platformasi

ElevenLabs'ga o'xshash, lekin o'zbek tili uchun yaratilgan AI ovoz klonlash platformasi.

---

## 🏗 Arxitektura

```
Next.js (Vercel)
    ↓
FastAPI (RunPod / VPS)
    ↓
Auth · Voice · Generation · Verification
    ↓
XTTS v2 (GPU) + Whisper ASR
    ↓
Redis Queue → Worker
    ↓
PostgreSQL + Cloudflare R2
```

---

## 🚀 Boshlash

### 1. Repository clone
```bash
git clone https://github.com/sizning/voxuz
cd voxuz
```

### 2. Environment sozlash
```bash
cp .env.example .env
# .env faylini to'ldiring
```

### 3. Docker bilan ishga tushirish
```bash
docker-compose up -d postgres redis
docker-compose up -d api
python backend/worker.py   # GPU serverda alohida
```

### 4. Local development
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 📡 API Endpointlar

| Method | URL | Tavsif |
|--------|-----|--------|
| POST | `/api/v1/auth/register` | Ro'yxatdan o'tish |
| POST | `/api/v1/auth/login` | Kirish |
| GET  | `/api/v1/verification/text` | Tasdiqlash matni olish |
| POST | `/api/v1/verification/verify` | Ovozni tasdiqlash |
| POST | `/api/v1/voices/clone` | Ovoz klonlash |
| GET  | `/api/v1/voices/` | Mening ovozlarim |
| GET  | `/api/v1/voices/public` | Ommaviy ovozlar |
| POST | `/api/v1/generation/` | Audio yaratish |
| GET  | `/api/v1/generation/{id}` | Status tekshirish |

---

## 💳 Kredit tizimi

| Amal | Narx |
|------|------|
| Ro'yxatdan o'tish | +100 kredit |
| Shaxsiy ovoz klonlash | −10 kredit |
| Ommaviy ovoz klonlash | −3 kredit |
| Audio yaratish | −1 kredit |
| Ommaviy ovoz bonusi | +50 kredit |

---

## 🔒 Xavfsizlik qoidalari

- ❌ MP3 fayl yuklab bo'lmaydi — faqat **live recording**
- ✅ Whisper bilan matn tasdiqlash
- ✅ JWT authentication
- ✅ Rate limiting (30 req/min)
- ✅ Audio davomiyligi cheklovi (max 30s)
- ✅ Bank, siyosiy, firibgarlik content bloklash

---

## 🚢 Deploy

| Komponent | Platforma |
|-----------|-----------|
| Frontend | Vercel |
| API | RunPod / Hetzner VPS |
| Worker (GPU) | RunPod A100/H100 |
| Database | Supabase |
| Redis | Upstash |
| Storage | Cloudflare R2 |

---

## 📦 Loyiha tuzilmasi

```
voxuz/
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── worker.py               # Redis queue worker
│   ├── telegram_bot.py         # Aiogram bot
│   ├── app/
│   │   ├── api/routes/         # auth, voices, generation, verification
│   │   ├── core/               # config, database, redis, security
│   │   └── services/           # tts_service, whisper_service, storage_service
│   ├── requirements.txt
│   └── requirements-gpu.txt
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.worker
├── nginx/nginx.conf
├── docker-compose.yml
└── .env.example
```

---

## 🤝 Litsenziya

MIT License
=======
# voxuz
>>>>>>> 2092d25fb7e0181aab40af836c40ebf36e1050ee
