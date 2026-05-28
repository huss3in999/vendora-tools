@echo off
setlocal

cd /d "%~dp0.."

echo Set Vendora Transport phone notification webhook
echo.
echo Recommended phone app: ntfy
echo 1. Install ntfy on your phone.
echo 2. Subscribe to a private topic name.
echo 3. Enter the topic URL when Wrangler asks, for example:
echo    https://ntfy.sh/your-private-topic-name
echo.

npx wrangler secret put TRANSPORT_NOTIFY_WEBHOOK_URL

echo.
echo After saving this secret, open Admin ^> Alerts to choose WhatsApp clicks, page visits, or pause all notifications.
echo If Wrangler says the latest Worker is not deployed, run deploy-vendora-live.bat first, then run this file again.
pause

endlocal
