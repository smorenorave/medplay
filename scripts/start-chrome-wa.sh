#!/usr/bin/env bash
set -euo pipefail

PORT="${DEBUG_PORT:-9222}"
PROFILE_DIR="${WA_PROFILE_DIR:-$HOME/.config/wa-chrome-profile}"
CHROME_BIN="${CHROME_BIN:-}"

# Detect Chrome/Chromium binary if not provided
if [[ -z "$CHROME_BIN" ]]; then
  for c in google-chrome-stable google-chrome chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1; then CHROME_BIN="$c"; break; fi
  done
fi

if [[ -z "$CHROME_BIN" ]]; then
  echo "❌ No se encontró Google Chrome/Chromium. Instálalo e intenta de nuevo." >&2
  exit 1
fi

mkdir -p "$PROFILE_DIR"

# Si ya está vivo el puerto de depuración, no lanzamos otro
if ! curl -s "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
  "$CHROME_BIN"     --remote-debugging-port="$PORT"     --user-data-dir="$PROFILE_DIR"     --no-first-run --no-default-browser-check     --disable-background-networking     --disable-features=Translate     --disable-sync     --disable-gpu     --disable-dev-shm-usage     --disable-extensions     --window-size=1200,900     "https://google.com" >/dev/null 2>&1 &
  disown
fi

# Esperar a que CDP esté disponible
for i in {1..60}; do
  if curl -s "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
    echo "✅ CDP de Chrome listo en puerto $PORT"
    exit 0
  fi
  sleep 0.5
done

echo "❌ No se pudo verificar CDP en puerto $PORT" >&2
exit 2
