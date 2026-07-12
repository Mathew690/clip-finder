@echo off
title ClipScry Sync
cd /d D:\Projects\clip-finder
echo.
echo  ClipScry - scanning, transcribing, and exporting any requested clips...
echo.
call npm run sync
echo.
echo  Done! New clips are searchable, and any exported clips are in the exports folder.
if exist exports start "" exports
echo  You can close this window.
pause
