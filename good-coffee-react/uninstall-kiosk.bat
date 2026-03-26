@echo off
:: This script removes the kiosk auto-start shortcut from the Startup folder.

echo ============================================
echo  Good Coffee - Remove Kiosk Auto-Start
echo ============================================
echo.

set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\GoodCoffeeKiosk.lnk"

if exist "%SHORTCUT%" (
    del "%SHORTCUT%"
    echo Kiosk auto-start has been removed.
) else (
    echo No auto-start shortcut found. Nothing to remove.
)

echo.
pause
