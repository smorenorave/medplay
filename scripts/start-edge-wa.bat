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

start "" "%BROWSER_EXE%" ^
  --remote-debugging-port=%DEBUG_PORT% ^
  --user-data-dir="%USER_DATA_DIR%" ^
  --profile-directory="%USER_PROFILE%" ^
  --no-first-run ^
  --no-default-browser-check

endlocal
exit /b 0