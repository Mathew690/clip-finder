@echo off
title ClipScry Sync
cd /d D:\Projects\clip-finder
echo.
echo  ClipScry - scanning your OBS folder and transcribing new clips...
echo.
call npm run sync
echo.
echo  Done! Your new clips are searchable. You can close this window.
pause
