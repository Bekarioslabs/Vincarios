@echo off
cd /d "%~dp0"

set "APP_DIR=%~dp0"
set "ELECTRON_EXE=%APP_DIR%node_modules\electron\dist\electron.exe"
set "ELECTRON_CLI=%APP_DIR%node_modules\electron\cli.js"
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

echo Starting ZEUS Agent from:
echo %APP_DIR%
echo.

if exist "%ELECTRON_EXE%" (
  "%ELECTRON_EXE%" .
  goto done
)

if exist "%BUNDLED_NODE%" if exist "%ELECTRON_CLI%" (
  "%BUNDLED_NODE%" "%ELECTRON_CLI%" .
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
