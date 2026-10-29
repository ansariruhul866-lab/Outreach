@echo off
title OutreachBot SaaS Platform
echo ========================================================
echo   OutreachBot - Standalone Cold Outreach SaaS Platform
echo ========================================================
echo.
cd /d %~dp0backend
if not exist "venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  python -m venv venv
  .\venv\Scripts\pip.exe install -r requirements.txt
)

echo Starting OutreachBot server on http://localhost:8000 ...
echo Open your browser at: http://localhost:8000
.\venv\Scripts\python.exe main.py
pause
