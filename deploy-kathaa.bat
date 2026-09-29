@echo off
title Kathaa 360 - Manual Deploy
cd /d "D:\Athi 360\apps\kathaa-mvp"
echo ============================================
echo   Pushing Kathaa 360 to kathaa.athi360.uk ...
echo ============================================
npx wrangler pages deploy . --project-name=kathaa --commit-dirty=true
echo.
echo Done. Live in ~30 seconds at https://kathaa.athi360.uk
pause