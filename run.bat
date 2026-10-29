@echo off
title OutreachBot Full-Stack Platform
echo ========================================================
echo   OutreachBot - Next.js & FastAPI Cold Outreach Platform
echo ========================================================
echo.

set ROOT_DIR=%~dp0

echo [1/2] Starting Backend Server (FastAPI on port 8000)...
start "OutreachBot Backend" cmd /k "cd /d %ROOT_DIR%backend && if not exist venv\Scripts\python.exe (python -m venv venv && .\venv\Scripts\pip.exe install -r requirements.txt) && .\venv\Scripts\python.exe main.py"

echo [2/2] Starting Next.js Frontend (port 3000)...
start "OutreachBot Next.js Frontend" cmd /k "cd /d %ROOT_DIR%frontend && npm run dev"

echo.
echo ========================================================
echo  Both servers are starting!
echo  Backend API: http://localhost:8000/api
echo  Next.js App: http://localhost:3000
echo ========================================================
echo.
pause
