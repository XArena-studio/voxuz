@echo off
title VoxUz Starter
echo VoxUz ishga tushirilmoqda...

:: Docker
start "Docker" cmd /k "cd C:\Users\VICTUS\voxuz && docker compose up -d postgres redis"
timeout /t 5

:: Backend
start "Backend" cmd /k "cd C:\Users\VICTUS\voxuz\backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"
timeout /t 5

:: Worker
start "Worker" cmd /k "cd C:\Users\VICTUS\voxuz\backend && venv\Scripts\activate && python worker.py"
timeout /t 3

:: Frontend
start "Frontend" cmd /k "cd C:\Users\VICTUS\voxuz\frontend && npm run dev -- --port 4000"
timeout /t 3

:: Browser
start chrome http://localhost:4000

echo Hammasi ishga tushdi!