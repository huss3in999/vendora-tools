@echo off
setlocal

cd /d "%~dp0.."

echo Reset Vendora Transport admin password
echo.
echo Type the new password when Wrangler asks for the secret value.
echo After it is saved, use that exact password in:
echo https://getvendora.net/bahrain-saudi-gcc-transport/admin/
echo.

npx wrangler secret put TRANSPORT_ADMIN_TOKEN

echo.
echo If Wrangler says the latest Worker is not deployed, run deploy-vendora-live.bat first, then run this file again.
pause

endlocal
