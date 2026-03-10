@echo off
TITLE Start Kyuna Services

:: Check for Administrator privileges (required to start Windows Services)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative privileges required!
    echo Please right-click this file and select "Run as administrator".
    pause
    exit /b 1
)

echo Starting Kyuna Qdrant Service...
powershell -Command "Stop-Service -Name KyunaQdrant -ErrorAction SilentlyContinue; Start-Service -Name KyunaQdrant -ErrorAction SilentlyContinue"

echo Starting Kyuna Backend Service...
powershell -Command "Stop-Service -Name KyunaBackend -ErrorAction SilentlyContinue; Start-Service -Name KyunaBackend -ErrorAction SilentlyContinue"

echo Starting Kyuna AI Server Service...
powershell -Command "Stop-Service -Name KyunaAIServer -ErrorAction SilentlyContinue; Start-Service -Name KyunaAIServer -ErrorAction SilentlyContinue"

echo Starting Kyuna Frontend (Background task)...
powershell -Command "Start-Process node -WorkingDirectory '%~dp0frontend' -ArgumentList 'node_modules\vite\bin\vite.js preview --port=5173' -WindowStyle Hidden"

echo.
echo Kyuna Backend, AI Server, and Qdrant are now running as Windows Services!
echo Kyuna Frontend is running completely in the background.
echo.
pause
