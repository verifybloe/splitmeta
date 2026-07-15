@echo off
title SplitMeta Setup
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is required. Install from https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo Installing SplitMeta (first run may take a minute)...
call npm install
if errorlevel 1 exit /b 1

echo.
echo Launching SplitMeta — sign in with your website account.
call npm start
