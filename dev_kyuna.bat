@echo off
echo Starting Kyuna complete stack for testing...

echo =========================================
echo Starting Frontend (Vite)
echo =========================================
start "Kyuna Frontend" cmd /k "cd frontend && npm run dev"

echo =========================================
echo Starting Qdrant Vector DB
echo =========================================
start "Kyuna Qdrant" cmd /k "cd qdrant && qdrant.exe"

echo =========================================
echo Starting AI Server (Port 8001)
echo =========================================
start "Kyuna AI Server" cmd /k "cd ai_server && call venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8001"

echo =========================================
echo Starting Backend (Port 8000)
echo =========================================
start "Kyuna Backend" cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo All services launched in separate windows!
echo You can close this window now. The servers will keep running in their own windows.
pause
