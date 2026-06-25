@echo off
cd /d "%~dp0"

if exist "%~dp0node_modules\electron\dist\electron.exe" (
  "%~dp0node_modules\electron\dist\electron.exe" .
) else (
  echo Local Electron runtime was not found.
  echo Please run npm install in this folder before starting ZEUS Agent.
)

pause