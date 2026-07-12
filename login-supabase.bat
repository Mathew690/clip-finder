@echo off
title ClipScry - Supabase Login
cd /d D:\Projects\clip-finder
echo.
echo  Logging in to Supabase...
echo  A browser window will open - approve it, then come back here.
echo.
npx --yes supabase login
echo.
echo  Done! You can close this window and tell Claude it's finished.
pause
