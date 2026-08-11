@echo off
setlocal

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else (
    set "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if "%DEBUG_PORT%"=="" set "DEBUG_PORT=9222"
set "USER_DATA_DIR=%LOCALAPPDATA%\EdgeWAProfile"
set "USER_PROFILE=Default"

if not exist "%USER_DATA_DIR%" mkdir "%USER_DATA_DIR%"

REM --- Cerrar cualquier instancia previa de Edge de este mismo perfil ---
REM Evita reutilizar un proceso "zombie"/congelado dejado por una corrida
REM anterior. Edge suspende procesos inactivos tras varias horas (modo
REM eficiencia / pestanas dormidas), lo que hace que el handshake de CDP
REM se cuelgue aunque el puerto 9222 siga respondiendo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kill-edge-wa.ps1"

REM Pequena espera para que Windows libere el SingletonLock del perfil
timeout /t 2 /nobreak >nul

start "" "%BROWSER_EXE%" ^
  --remote-debugging-port=%DEBUG_PORT% ^
  --user-data-dir="%USER_DATA_DIR%" ^
  --profile-directory="%USER_PROFILE%" ^
  --no-first-run ^
  --no-default-browser-check ^
  https://web.whatsapp.com

endlocal
exit /b 0
