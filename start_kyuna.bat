@echo off
title Kyuna Launcher
setlocal enabledelayedexpansion
color 0E
cls
echo.

cd /d "d:\project-kyuna"

:: ── Step 1: Force Cleanup ──────────────────────────────────────────────────
echo [1/4] Cleaning up stale processes...

taskkill /F /IM qdrant.exe /T >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Kyuna*" /T >nul 2>&1

:: Kill anything on our ports
call :kill_port 6333
call :kill_port 6334
call :kill_port 8001
call :kill_port 8000
call :kill_port 5173

echo       Waiting for ports to release...
timeout /t 3 /nobreak >nul

:: Second pass — sometimes processes linger
call :kill_port 6333
call :kill_port 6334
call :kill_port 8001
call :kill_port 8000
call :kill_port 5173

timeout /t 2 /nobreak >nul

:: Verify port 6333 specifically (the critical one for Qdrant)
call :check_port 6333
if "!PORT_IN_USE!"=="1" (
    echo.
    echo  ERROR: Port 6333 is still in use. Cannot start Qdrant.
    echo  Run: netstat -aon ^| findstr ":6333"  to find the process.
    echo.
    pause
    exit /b 1
)
echo       Ports cleared.

:: ── Step 2: Qdrant WAL Repair ──────────────────────────────────────────────
echo [2/4] Repairing Vector DB (Qdrant WAL)...
set "QDR_STORAGE=d:\project-kyuna\qdrant\storage\collections"

if not exist "%QDR_STORAGE%" (
    echo       WARNING: Qdrant storage not found, skipping repair.
    goto :launch
)

for /d %%C in ("%QDR_STORAGE%\*") do (
    echo       Collection: %%~nxC
    for /d %%S in ("%%C\*") do (
        if exist "%%S\segments" (
            if exist "%%S\.wal" del /f /q "%%S\.wal" >nul 2>&1
            if exist "%%S\wal" (
                rmdir /s /q "%%S\wal" >nul 2>&1
                if exist "%%S\wal" del /f /q "%%S\wal\*" >nul 2>&1
            )
            if not exist "%%S\wal" mkdir "%%S\wal"
        )
    )
)
echo       WAL repair complete.

:: ── Step 3: Launch Services ────────────────────────────────────────────────
:launch
echo [3/4] Starting services...

:: 3a. Qdrant
echo       Starting Qdrant...
start "Kyuna — Qdrant" cmd /k "cd /d d:\project-kyuna\qdrant && qdrant.exe"

:: Poll health endpoint
set "RETRIES=0"
:qdr_poll
if !RETRIES! GEQ 15 goto :qdr_timeout
set /a RETRIES+=1
timeout /t 1 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:6333/healthz 2>nul | findstr "200" >nul 2>&1
if errorlevel 1 goto :qdr_poll
echo       Qdrant ready on port 6333.
goto :qdr_done

:qdr_timeout
echo       WARNING: Qdrant health check timed out, continuing anyway.

:qdr_done

:: 3b. AI Server
echo       Starting AI Server...
start "Kyuna — AI Server" cmd /k "cd /d d:\project-kyuna\ai_server && call venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8001"
timeout /t 1 /nobreak >nul

:: 3c. Backend
echo       Starting Backend...
start "Kyuna — Backend" cmd /k "cd /d d:\project-kyuna\backend && call venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"
timeout /t 1 /nobreak >nul

:: ── Step 4: Launch Frontend ────────────────────────────────────────────────
echo [4/4] Starting Frontend...
start "Kyuna — Frontend" cmd /k "cd /d d:\project-kyuna\frontend && npm run preview"

echo.
echo   All services deployed.
echo   Qdrant:    http://localhost:6333/dashboard
echo   Backend:   http://localhost:8000
echo   AI Server: http://localhost:8001
echo   Frontend:  http://localhost:5173
echo.
timeout /t 5 /nobreak >nul
exit /b 0

:: ════════════════════════════════════════════════════════════════════════════
:: SUBROUTINES
:: ════════════════════════════════════════════════════════════════════════════

:kill_port
:: Usage: call :kill_port <port_number>
for /f "tokens=5" %%A in ('netstat -aon 2^>nul ^| findstr ":%~1 " ^| findstr "LISTENING"') do (
    if not "%%A"=="0" (
        echo       Killing PID %%A on port %~1
        taskkill /F /PID %%A >nul 2>&1
    )
)
exit /b 0

:check_port
:: Usage: call :check_port <port_number>  — sets PORT_IN_USE=1 if busy
set "PORT_IN_USE=0"
netstat -aon 2>nul | findstr ":%~1 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 set "PORT_IN_USE=1"
exit /b 0
