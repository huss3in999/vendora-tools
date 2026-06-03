@echo off
setlocal
cd /d "%~dp0"
title Vendora Transport One-Click Deploy

echo.
echo Vendora Transport - One Click Deploy (no password reset)
echo --------------------------------------------------------
echo - Logs into Cloudflare if needed
echo - Deploys the Worker + static assets from the PUBLIC folder
echo - Verifies /api/transport/health is live
echo - Opens the admin page
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0DEPLOY-ADMIN-ONE-CLICK.ps1"

echo.
pause
endlocal
