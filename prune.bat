@echo off
title ClipScry - Remove deleted clips
cd /d D:\Projects\clip-finder
echo.
echo  Removing clips whose video files you deleted (keeping the ones you still have)...
echo.
call npm run prune
echo.
echo  Done. You can close this window.
pause
