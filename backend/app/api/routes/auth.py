from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db, User
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    credits: int
    user_id: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu email allaqachon ro'yxatdan o'tgan")

    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Parol kamida 8 ta belgi bo'lishi kerak")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        credits=settings.CREDITS_ON_REGISTER,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return AuthResponse(access_token=token, credits=user.credits, user_id=str(user.id))


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email, User.is_active == True))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email yoki parol noto'g'ri")

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return AuthResponse(access_token=token, credits=user.credits, user_id=str(user.id))


@router.get("/me")
async def me(db: AsyncSession = Depends(get_db)):
    # Used with Depends(get_current_user) in actual protected routes
    return {"message": "Use Authorization: Bearer <token>"}
