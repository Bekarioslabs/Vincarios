@echo off
cd /d "%~dp0"

set "APP_DIR=%~dp0"
set "ELECTRON_EXE=%APP_DIR%node_modules\electron\dist\electron.exe"
set "ELECTRON_CLI=%APP_DIR%node_modules\electron\cli.js"
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "ZEUS_USER_DATA=%LOCALAPPDATA%\ZEUS_AGENT\electron-user-data"
set "ZEUS_DISK_CACHE=%LOCALAPPDATA%\ZEUS_AGENT\electron-cache"

if not exist "%ZEUS_USER_DATA%" mkdir "%ZEUS_USER_DATA%"
if not exist "%ZEUS_DISK_CACHE%" mkdir "%ZEUS_DISK_CACHE%"

echo Starting ZEUS Agent from:
echo %APP_DIR%
echo.

if exist "%ELECTRON_EXE%" (
  "%ELECTRON_EXE%" --user-data-dir="%ZEUS_USER_DATA%" --disk-cache-dir="%ZEUS_DISK_CACHE%" .
  goto done
)

if exist "%BUNDLED_NODE%" if exist "%ELECTRON_CLI%" (
  "%BUNDLED_NODE%" "%ELECTRON_CLI%" --user-data-dir="%ZEUS_USER_DATA%" --disk-cache-dir="%ZEUS_DISK_CACHE%" .
  goto done
)

echo Local Electron runtime was not found.
echo Checked:
echo %ELECTRON_EXE%
echo %ELECTRON_CLI%
echo.
echo Please run npm install in this folder before starting ZEUS Agent.

:done

pause
