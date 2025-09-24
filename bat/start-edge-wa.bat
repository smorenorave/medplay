@echo off
setlocal

REM === Config ===
set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "DEBUG_PORT=9222"
set "USER_DATA_DIR=%LOCALAPPDATA%\EdgeWAProfile"
set "USER_PROFILE=Default"

REM Perfil dedicado (persistente para WhatsApp)
if not exist "%USER_DATA_DIR%" mkdir "%USER_DATA_DIR%"

REM Opcional: cerrar Edge previo (evita sesiones colgadas)
taskkill /F /IM msedge.exe >NUL 2>&1

REM Lanzar Edge con CDP y perfil
start "" "%BROWSER_EXE%" ^
  --remote-debugging-port=%DEBUG_PORT% ^
  --user-data-dir="%USER_DATA_DIR%" ^
  --profile-directory="%USER_PROFILE%"

endlocal
exit /b 0
