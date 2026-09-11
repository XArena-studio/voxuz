"""
Telegram Bot — VoxUz
Ishga tushirish: python telegram_bot.py
"""
import asyncio
import aiohttp
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, BufferedInputFile
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage

BOT_TOKEN = "8932069721:AAEp97CVclwkXt_QhRDNVZbbP_Humherm20"
API_BASE = "http://localhost:8000/api/v1"

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())

# User sessions: telegram_id -> jwt token
user_tokens: dict[int, str] = {}


class GenerateFlow(StatesGroup):
    waiting_text = State()
    waiting_voice = State()


# ── /start ──────────────────────────────────────────────────────────────────
@dp.message(Command("start"))
async def cmd_start(msg: Message):
    await msg.answer(
        "🎙 <b>VoxUz</b> — O'zbek AI Ovoz Platformasi\n\n"
        "Buyruqlar:\n"
        "/login — Kirish\n"
        "/generate — Audio yaratish\n"
        "/voices — Mening ovozlarim\n"
        "/credits — Kreditlar\n"
        "/help — Yordam",
        parse_mode="HTML",
    )


# ── /login ───────────────────────────────────────────────────────────────────
class LoginFlow(StatesGroup):
    email = State()
    password = State()


@dp.message(Command("login"))
async def cmd_login(msg: Message, state: FSMContext):
    await msg.answer("📧 Email manzilingizni kiriting:")
    await state.set_state(LoginFlow.email)


@dp.message(LoginFlow.email)
async def login_email(msg: Message, state: FSMContext):
    await state.update_data(email=msg.text.strip())
    await msg.answer("🔑 Parolingizni kiriting:")
    await state.set_state(LoginFlow.password)


@dp.message(LoginFlow.password)
async def login_password(msg: Message, state: FSMContext):
    data = await state.get_data()
    await state.clear()

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_BASE}/auth/login",
            json={"email": data["email"], "password": msg.text},
        ) as resp:
            if resp.status == 200:
                body = await resp.json()
                user_tokens[msg.from_user.id] = body["access_token"]
                await msg.answer(
                    f"✅ Xush kelibsiz!\n💳 Kreditlar: {body['credits']}",
                    parse_mode="HTML",
                )
            else:
                await msg.answer("❌ Email yoki parol noto'g'ri. /login qaytadan urining.")


# ── /credits ─────────────────────────────────────────────────────────────────
@dp.message(Command("credits"))
async def cmd_credits(msg: Message):
    token = user_tokens.get(msg.from_user.id)
    if not token:
        await msg.answer("Iltimos avval /login qiling.")
        return

    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                await msg.answer(f"💳 Kreditlaringiz: <b>{data.get('credits', '?')}</b>", parse_mode="HTML")
            else:
                await msg.answer("Token muddati o'tgan. /login qiling.")


# ── /generate ────────────────────────────────────────────────────────────────
@dp.message(Command("generate"))
async def cmd_generate(msg: Message, state: FSMContext):
    token = user_tokens.get(msg.from_user.id)
    if not token:
        await msg.answer("Iltimos avval /login qiling.")
        return
    await msg.answer("📝 Audio yaratish uchun matn yuboring (max 500 belgi):")
    await state.set_state(GenerateFlow.waiting_text)


@dp.message(GenerateFlow.waiting_text)
async def gen_text(msg: Message, state: FSMContext):
    if len(msg.text) > 500:
        await msg.answer("❌ Matn 500 belgidan oshmasin.")
        return
    await state.update_data(text=msg.text)

    # Fetch user's voices
    token = user_tokens.get(msg.from_user.id)
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{API_BASE}/voices/",
            headers={"Authorization": f"Bearer {token}"},
        ) as resp:
            voices = await resp.json() if resp.status == 200 else []

    if not voices:
        await msg.answer("❌ Sizda ovoz yo'q. Avval web saytda ovoz klonlang.")
        await state.clear()
        return

    voice_list = "\n".join([f"{i+1}. {v['name']} (ID: {v['id'][:8]}...)" for i, v in enumerate(voices[:5])])
    await state.update_data(voices=voices)
    await msg.answer(f"🎙 Ovozni tanlang (raqam yuboring):\n{voice_list}")
    await state.set_state(GenerateFlow.waiting_voice)


@dp.message(GenerateFlow.waiting_voice)
async def gen_voice(msg: Message, state: FSMContext):
    data = await state.get_data()
    voices = data.get("voices", [])

    try:
        idx = int(msg.text.strip()) - 1
        if idx < 0 or idx >= len(voices):
            raise ValueError
    except ValueError:
        await msg.answer("❌ Noto'g'ri raqam. Qaytadan tanlang.")
        return

    voice = voices[idx]
    token = user_tokens.get(msg.from_user.id)

    wait_msg = await msg.answer("⏳ Audio yaratilmoqda...")

    async with aiohttp.ClientSession() as session:
        # Request generation
        async with session.post(
            f"{API_BASE}/generation/",
            json={"text": data["text"], "voice_id": voice["id"]},
            headers={"Authorization": f"Bearer {token}"},
        ) as resp:
            if resp.status != 200:
                await wait_msg.edit_text("❌ Generation xatosi.")
                await state.clear()
                return
            gen_data = await resp.json()
            gen_id = gen_data["generation_id"]

        # Poll status
        for _ in range(30):
            await asyncio.sleep(3)
            async with session.get(
                f"{API_BASE}/generation/{gen_id}",
                headers={"Authorization": f"Bearer {token}"},
            ) as status_resp:
                status_data = await status_resp.json()
                if status_data["status"] == "done":
                    output_url = status_data.get("output_url")
                    await wait_msg.edit_text(f"✅ Audio tayyor!\n🔗 {output_url}")
                    await state.clear()
                    return
                elif status_data["status"] == "failed":
                    await wait_msg.edit_text("❌ Generation muvaffaqiyatsiz tugadi.")
                    await state.clear()
                    return

    await wait_msg.edit_text("⏱ Timeout. Keyinroq /generate orqali urining.")
    await state.clear()


# ── /voices ──────────────────────────────────────────────────────────────────
@dp.message(Command("voices"))
async def cmd_voices(msg: Message):
    token = user_tokens.get(msg.from_user.id)
    if not token:
        await msg.answer("Iltimos avval /login qiling.")
        return

    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{API_BASE}/voices/",
            headers={"Authorization": f"Bearer {token}"},
        ) as resp:
            voices = await resp.json() if resp.status == 200 else []

    if not voices:
        await msg.answer("Sizda hech qanday ovoz yo'q. Web saytda ovoz qo'shing.")
        return

    lines = [f"🎙 <b>Ovozlaringiz:</b>"]
    for v in voices:
        pub = "🌐" if v["is_public"] else "🔒"
        lines.append(f"{pub} {v['name']} — {v['created_at'][:10]}")
    await msg.answer("\n".join(lines), parse_mode="HTML")


async def main():
    print("[Bot] VoxUz Telegram Bot ishga tushdi...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
