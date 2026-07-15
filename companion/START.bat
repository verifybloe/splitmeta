@echo off
cd /d "%~dp0"

if exist "dist\SplitMeta.exe" (
  start "" "%~dp0dist\SplitMeta.exe"
  exit /b 0
)

mshta "javascript:alert('Please run Setup.bat first to install SplitMeta.\n\nAfter setup, use the Desktop shortcut.');close()"
exit /b 1
