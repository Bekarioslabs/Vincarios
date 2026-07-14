@echo off
cd /d "%~dp0"

set "APP_DIR=%~dp0"
set "ELECTRON_EXE=%APP_DIR%node_modules\electron\dist\electron.exe"
set "ELECTRON_CLI=%APP_DIR%node_modules\electron\cli.js"
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "VITRUVIOS_PORTABLE_DATA=%APP_DIR%.vitruvios"

set "VITRUVIOS_USER_DATA=%VITRUVIOS_PORTABLE_DATA%\electron-user-data"
set "VITRUVIOS_DISK_CACHE=%VITRUVIOS_PORTABLE_DATA%\electron-cache"

if not exist "%VITRUVIOS_USER_DATA%" mkdir "%VITRUVIOS_USER_DATA%"
if not exist "%VITRUVIOS_DISK_CACHE%" mkdir "%VITRUVIOS_DISK_CACHE%"

echo Starting Vitruvios from:
echo %APP_DIR%
echo.

if exist "%ELECTRON_EXE%" (
  "%ELECTRON_EXE%" --user-data-dir="%VITRUVIOS_USER_DATA%" --disk-cache-dir="%VITRUVIOS_DISK_CACHE%" .
  goto done
)

if exist "%BUNDLED_NODE%" if exist "%ELECTRON_CLI%" (
  "%BUNDLED_NODE%" "%ELECTRON_CLI%" --user-data-dir="%VITRUVIOS_USER_DATA%" --disk-cache-dir="%VITRUVIOS_DISK_CACHE%" .
  goto done
)

echo Local Electron runtime was not found.
echo Checked:
echo %ELECTRON_EXE%
echo %ELECTRON_CLI%
echo.
echo Please run npm install in this folder before starting Vitruvios.

:done

pause
