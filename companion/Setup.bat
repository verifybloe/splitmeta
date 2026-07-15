@echo off
setlocal EnableDelayedExpansion
title SplitMeta Setup
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  mshta "javascript:alert('SplitMeta needs Node.js 18+.\n\nDownload from https://nodejs.org then run this setup again.');close()"
  exit /b 1
)

echo.
echo  SplitMeta Setup
echo  ===============
echo.
echo  Installing dependencies (first time may take a few minutes)...
echo.

call npm install
if errorlevel 1 (
  mshta "javascript:alert('Setup failed while installing dependencies.\n\nCheck your internet connection and try again.');close()"
  exit /b 1
)

echo.
echo  Building SplitMeta application...
echo.

call npm run build:app
if errorlevel 1 (
  mshta "javascript:alert('Setup failed while building the app.\n\nTry running Setup as Administrator or check antivirus did not block the build.');close()"
  exit /b 1
)

if not exist "dist\SplitMeta.exe" (
  mshta "javascript:alert('SplitMeta.exe was not created.\n\nPlease contact support or re-download from splitmeta.net/download');close()"
  exit /b 1
)

echo.
echo  Creating Desktop shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dir = '%CD%'; $exe = Join-Path $dir 'dist\SplitMeta.exe';" ^
  "$shell = New-Object -ComObject WScript.Shell;" ^
  "$desktop = [Environment]::GetFolderPath('Desktop');" ^
  "$shortcut = $shell.CreateShortcut((Join-Path $desktop 'SplitMeta.lnk'));" ^
  "$shortcut.TargetPath = $exe;" ^
  "$shortcut.WorkingDirectory = (Split-Path $exe);" ^
  "$shortcut.IconLocation = $exe + ',0';" ^
  "$shortcut.Description = 'SplitMeta — iRacing setup meta';" ^
  "$shortcut.Save()"

echo.
echo  Done! Launching SplitMeta...
echo.

start "" "%~dp0dist\SplitMeta.exe"

mshta "javascript:alert('SplitMeta is installed!\n\nUse the SplitMeta shortcut on your Desktop from now on.\nYou only need to run Setup once.');close()"
exit /b 0
