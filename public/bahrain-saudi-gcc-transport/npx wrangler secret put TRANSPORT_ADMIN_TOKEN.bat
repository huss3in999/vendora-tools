@echo off
cd /d "E:\Users\Hussain Alyaqoob\Documents\GitHub\public"

echo Deploying Cloudflare Worker...
npx wrangler deploy

echo.
echo Now updating admin password secret...
npx wrangler secret put TRANSPORT_ADMIN_TOKEN

echo.
echo Done. Press any key to close.
pause