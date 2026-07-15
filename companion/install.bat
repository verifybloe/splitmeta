@echo off
title SplitMeta Companion Setup
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is required. Install from https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist connect.json (
  echo.
  echo Missing connect.json — download the companion again from https://www.splitmeta.net/download
  echo.
  pause
  exit /b 1
)

echo Linking your SplitMeta account...
if not exist "%APPDATA%\SplitMeta" mkdir "%APPDATA%\SplitMeta"
copy /Y connect.json "%APPDATA%\SplitMeta\config.json" >nul

echo Installing dependencies...
call npm install
if errorlevel 1 exit /b 1

echo.
echo Confirm your telemetry folder (press Enter to keep the default):
call node src/index.mjs --setup

echo.
echo Setup complete. Run START.bat before you race.
pause
