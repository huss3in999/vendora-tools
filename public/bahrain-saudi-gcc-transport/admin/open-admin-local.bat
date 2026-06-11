@echo off
setlocal

set "PUBLIC_ROOT=%~dp0..\.."
set "ADMIN_URL=http://127.0.0.1:4173/bahrain-saudi-gcc-transport/admin/?local=1"

echo Starting local static server for Vendora Transport admin...
echo.
echo Admin URL:
echo %ADMIN_URL%
echo.
echo Keep this window open while using the admin page.
echo Close this window when you are finished.
echo.

start "" "%ADMIN_URL%"
cd /d "%PUBLIC_ROOT%"
npx --yes http-server . -p 4173 -c-1

endlocal
