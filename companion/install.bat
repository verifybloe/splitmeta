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

echo Installing dependencies...
call npm install
if errorlevel 1 exit /b 1

echo.
echo Paste your API key from https://www.splitmeta.net/account
echo.
call node src/index.mjs --setup
pause
