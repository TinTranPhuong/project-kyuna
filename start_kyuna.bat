@echo off
TITLE Kyuna System Launcher (Production)

echo Starting Kyuna Backend Server (Production)...
start "Kyuna Backend" cmd /k "cd /d D:\project-kyuna\backend && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Starting Kyuna AI Server (Production)...
start "Kyuna AI Server" cmd /k "cd /d D:\project-kyuna\ai_server && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8001"

echo Starting Kyuna Frontend Server (Production)...
start "Kyuna Frontend" cmd /k "cd /d D:\project-kyuna\frontend && npm run build && npm run preview -- --port=5173 "

echo.
echo All 3 production servers are launching in separate windows.
echo Close those individual windows to stop the servers.
echo.
pause
