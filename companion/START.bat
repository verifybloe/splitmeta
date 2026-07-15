@echo off
title SplitMeta
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js from https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Run install.bat first.
  pause
  exit /b 1
)

npm start
