@echo off
setlocal

cd /d "%~dp0.."

echo Deploying Vendora public site and transport API...
echo.
echo This script automatically runs from the parent public folder so the live Worker keeps:
echo - /api/transport/admin
echo - /bahrain-saudi-gcc-transport/api/transport/admin
echo - /api/transport/whatsapp-lead
echo.

npx wrangler deploy

echo.
echo Checking live transport API health...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'https://getvendora.net/api/transport/health' -UseBasicParsing; Write-Host $r.StatusCode; Write-Host $r.Content } catch { Write-Host $_.Exception.Message; exit 1 }"

echo.
echo Done. If health returned ok:true, the admin API route is live.
pause

endlocal
