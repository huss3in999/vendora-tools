@echo off
cd /d "%~dp0"
title Vendora Transport Admin Repair - stays open
cmd /k powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0REPAIR-ADMIN-STAYS-OPEN.ps1"
