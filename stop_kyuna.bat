@echo off
TITLE Stop Kyuna Services

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative privileges required to stop Windows Services!
    echo Please right-click this file and select "Run as administrator".
    pause
    exit /b 1
)

echo Stopping Kyuna Frontend...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM cmd.exe /F /FI "WINDOWTITLE eq npm*" >nul 2>&1

echo Stopping Kyuna Backend Service...
powershell -Command "Stop-Service -Name KyunaBackend -ErrorAction SilentlyContinue"

echo Stopping Kyuna AI Server Service...
powershell -Command "Stop-Service -Name KyunaAIServer -ErrorAction SilentlyContinue"

echo Stopping Kyuna Qdrant Service...
powershell -Command "Stop-Service -Name KyunaQdrant -ErrorAction SilentlyContinue"

echo.
echo All services stopped successfully.
echo.
pause
