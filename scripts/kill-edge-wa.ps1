# kill-edge-wa.ps1
# Cierra cualquier proceso msedge.exe que este usando el perfil de
# automatizacion (EdgeWAProfile), para que la siguiente corrida arranque
# un proceso fresco y no reutilice una instancia "zombie"/congelada
# dejada por una corrida anterior.
#
# IMPORTANTE: esto NO borra la sesion de WhatsApp Web. El login (cookies,
# localStorage, etc.) queda guardado en disco dentro de la carpeta del
# perfil (EdgeWAProfile), no en la memoria del proceso. Al cerrar y volver
# a abrir Edge con el mismo --user-data-dir, WhatsApp Web sigue logueado.
#
# Primero se intenta un cierre "suave" (CloseMainWindow), para que Chromium
# alcance a guardar cualquier escritura pendiente en el perfil. Solo si el
# proceso no responde en el tiempo dado, se fuerza el cierre.

$procs = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*EdgeWAProfile*' }

if (-not $procs) {
    Write-Output "No hay instancias previas de Edge (perfil EdgeWAProfile) corriendo."
    exit 0
}

foreach ($p in $procs) {
    try {
        $proc = Get-Process -Id $p.ProcessId -ErrorAction Stop
        Write-Output "Cerrando (suave) msedge.exe PID $($p.ProcessId)..."
        $proc.CloseMainWindow() | Out-Null
    } catch {
        # el proceso ya no existe o no tiene ventana principal; se maneja abajo
    }
}

# Dar tiempo a que cierren solos (hasta 5s)
$deadline = (Get-Date).AddSeconds(5)
do {
    Start-Sleep -Milliseconds 300
    $stillRunning = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like '*EdgeWAProfile*' }
} while ($stillRunning -and (Get-Date) -lt $deadline)

# Forzar el cierre de lo que haya quedado vivo
if ($stillRunning) {
    foreach ($p in $stillRunning) {
        try {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
            Write-Output "Forzado el cierre de msedge.exe PID $($p.ProcessId)"
        } catch {
            Write-Output "No se pudo cerrar PID $($p.ProcessId): $($_.Exception.Message)"
        }
    }
} else {
    Write-Output "Todas las instancias cerraron correctamente (modo suave)."
}
