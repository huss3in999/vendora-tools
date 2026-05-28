@echo off
setlocal

cd /d "%~dp0.."

echo ============================================================
echo Vendora Transport Admin Repair
echo ============================================================
echo.
echo This will:
echo 1. Check Cloudflare Wrangler login
echo 2. Open Cloudflare login if needed
echo 3. Deploy the live Worker and transport API
echo 4. Reset the admin password secret
echo 5. Optionally set phone notification webhook
echo 6. Check the live API health route
echo.
echo IMPORTANT:
echo - 401 Unauthorized means the API route works but the admin password is wrong.
echo - 404 Not Found means the Worker/API was not deployed from the parent public folder.
echo.

echo Checking Cloudflare login...
npx wrangler whoami
if errorlevel 1 (
  echo.
  echo Wrangler is not logged in. A browser window will open.
  echo Log in to Cloudflare, then return to this window.
  echo.
  npx wrangler login
  if errorlevel 1 (
    echo.
    echo Cloudflare login failed. Please try again.
    pause
    exit /b 1
  )
)

echo.
echo Deploying live Worker and transport API...
npx wrangler deploy
if errorlevel 1 (
  echo.
  echo Deploy failed. Please read the Wrangler error above.
  pause
  exit /b 1
)

echo.
echo Reset admin password.
echo Type the NEW password when Wrangler asks for the secret value.
echo Use the same password on the admin login page.
echo.
npx wrangler secret put TRANSPORT_ADMIN_TOKEN
if errorlevel 1 (
  echo.
  echo Secret update failed. The Worker may need another deploy.
  echo Running deploy one more time, then retry this repair file if needed.
  npx wrangler deploy
  pause
  exit /b 1
)

echo.
set /p SET_PHONE_ALERTS="Do you want to set or replace phone alerts webhook now? (Y/N): "
if /I "%SET_PHONE_ALERTS%"=="Y" (
  echo.
  echo Enter your private ntfy topic URL when Wrangler asks.
  echo Example: https://ntfy.sh/your-private-topic-name
  echo.
  npx wrangler secret put TRANSPORT_NOTIFY_WEBHOOK_URL
  if errorlevel 1 (
    echo.
    echo Phone webhook secret failed. You can run set-transport-phone-alerts.bat later.
  )
)

echo.
echo Checking live transport API health...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'https://getvendora.net/api/transport/health' -UseBasicParsing; Write-Host ''; Write-Host 'Health status:' $r.StatusCode; Write-Host $r.Content; if ($r.Content -notmatch 'ok') { exit 1 } } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 (
  echo.
  echo Health check failed. The route may still be deploying. Wait 30 seconds and run this file again.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo Done.
echo ============================================================
echo.
echo Open:
echo https://getvendora.net/bahrain-saudi-gcc-transport/admin/
echo.
echo Use the NEW password you just entered for TRANSPORT_ADMIN_TOKEN.
echo.
pause

endlocal
