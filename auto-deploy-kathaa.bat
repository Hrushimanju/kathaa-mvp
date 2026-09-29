@echo off
title Kathaa 360 - AUTO-DEPLOY watcher
cd /d "D:\Athi 360\apps\kathaa-mvp"
echo ============================================
echo   AUTO-DEPLOY mode: every file save goes
echo   LIVE on kathaa.athi360.uk automatically.
echo   Keep this window open while editing.
echo ============================================
node watch-deploy.js
pause