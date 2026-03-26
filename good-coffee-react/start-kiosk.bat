@echo off
title Good Coffee - Kiosk Server
cd /d "%~dp0"

echo ============================================
echo        GOOD COFFEE - Kiosk Mode
echo ============================================
echo.

:: Make sure PostgreSQL is running
echo Checking PostgreSQL...
net start postgresql-x64-16 >nul 2>&1
echo PostgreSQL is running.
echo.

:: Start the Node.js server in the background
echo Starting server...
start /b node server.cjs

:: Wait for the server to be ready (give it time to connect to DB and start)
echo Waiting for server to initialize...
timeout /t 8 /nobreak >nul

echo.
echo Server is ready!
echo.

:: Try Microsoft Edge first (most common on Windows), fallback to Chrome
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    echo Launching Edge in kiosk mode...
    start "" msedge --kiosk "http://localhost:3001/staff" --edge-kiosk-type=fullscreen --no-first-run
    goto RUNNING
)

:: Try Edge from default install path
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo Launching Edge in kiosk mode...
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:3001/staff" --edge-kiosk-type=fullscreen --no-first-run
    goto RUNNING
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo Launching Edge in kiosk mode...
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:3001/staff" --edge-kiosk-type=fullscreen --no-first-run
    goto RUNNING
)

:: Try Google Chrome
where chrome >nul 2>&1
if %errorlevel% equ 0 (
    echo Launching Chrome in kiosk mode...
    start "" chrome --kiosk "http://localhost:3001/staff" --no-first-run
    goto RUNNING
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo Launching Chrome in kiosk mode...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk "http://localhost:3001/staff" --no-first-run
    goto RUNNING
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo Launching Chrome in kiosk mode...
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk "http://localhost:3001/staff" --no-first-run
    goto RUNNING
)

:: Fallback: open in default browser (not kiosk)
echo No Edge or Chrome found. Opening in default browser...
start http://localhost:3001/staff

:RUNNING
echo.
echo ============================================
echo  Server is running. Do NOT close this window.
echo  Press Ctrl+C to stop the server.
echo ============================================
echo.

:: Keep the window open so the server keeps running
:KEEP_ALIVE
timeout /t 3600 /nobreak >nul
goto KEEP_ALIVE
