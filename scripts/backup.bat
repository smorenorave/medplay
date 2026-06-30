@echo off
:: --- CONFIGURACIÓN ---
set MYSQLDUMP="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
set RCLONE="C:\rclone-v1.74.3-windows-amd64\rclone.exe"

set DB_USER=root
set DB_PASS=casa123
set DB_NAME=medplay
set BACKUP_DIR=C:\Backups_DB

:: CAMBIA ESTO POR EL NOMBRE QUE TE APAREZCA EN ".\rclone listremotes"
set DRIVE_DESTINO=medplay:BackupsMySQL

set ARCHIVO=backup_medplay.sql

:: --- PROCESO ---
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Iniciando backup de %DB_NAME%...
:: Usamos --password= en lugar de -p para evitar errores con caracteres especiales
%MYSQLDUMP% -u%DB_USER% --password=%DB_PASS% %DB_NAME% > "%BACKUP_DIR%\%ARCHIVO%"

if %errorlevel% neq 0 (
    echo ¡Error en el backup de MySQL! Revisa la ruta de mysqldump o el password.
    pause
    exit /b
)

echo Subiendo a Google Drive...
%RCLONE% copy "%BACKUP_DIR%\%ARCHIVO%" %DRIVE_DESTINO%

if %errorlevel% neq 0 (
    echo ¡Error subiendo a Google Drive! Verifica el nombre del remoto en rclone.
    pause
    exit /b
)

echo ¡Backup completado con éxito!
exit