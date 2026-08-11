@echo off

echo ==== %date% %time% ==== >> C:\Medplay\medplay\.logs\enviar_vencidos.log

cd /d C:\Medplay\medplay

"C:\Program Files\nodejs\node.exe" "C:\Medplay\medplay\scripts\enviar_vencidos.js" >> C:\Medplay\enviar_vencidos.log 2>&1