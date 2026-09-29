@echo off
title Kathaa 360 - Local Server
cd /d "D:\Athi 360\apps\kathaa-mvp"
echo ============================================
echo   Kathaa 360 starting on http://localhost:8080
echo   Keep this window OPEN while you use the app.
echo   Close this window = app goes offline.
echo ============================================
start "" http://localhost:8080
python -m http.server 8080