@echo off
:: This script creates a shortcut in the Windows Startup folder
:: so that the kiosk starts automatically when the PC boots up.
:: Run this ONCE as administrator.

echo ============================================
echo  Good Coffee - Install Kiosk Auto-Start
echo ============================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SCRIPT_DIR=%~dp0"
set "SHORTCUT=%STARTUP_FOLDER%\GoodCoffeeKiosk.lnk"

:: Create shortcut using PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%SCRIPT_DIR%start-kiosk.bat'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.WindowStyle = 7; $s.Description = 'Good Coffee Kiosk Server'; $s.Save()"

if exist "%SHORTCUT%" (
    echo.
    echo SUCCESS! Kiosk auto-start has been installed.
    echo.
    echo Shortcut created at:
    echo   %SHORTCUT%
    echo.
    echo The kiosk will now start automatically when this PC boots up.
    echo.
    echo To REMOVE auto-start, run: uninstall-kiosk.bat
) else (
    echo.
    echo ERROR: Failed to create shortcut.
    echo Try running this script as Administrator.
)

echo.
pause
