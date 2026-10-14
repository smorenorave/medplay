@echo off
setlocal
cd /d "%~dp0.."
node scripts\enviar_vencidos_local.cjs --enviar
pause
