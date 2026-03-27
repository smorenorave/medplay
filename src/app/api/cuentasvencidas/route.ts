// src/app/api/cuentasvencidas/route.ts
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ====== LOCK (anti doble POST / doble spawn) ====== */
const LOCKS_DIR = path.resolve(process.cwd(), '.locks');
const LOCK_FILE = path.join(LOCKS_DIR, 'notify.lock');
// Bloquea nuevas ejecuciones por 5 minutos.
// Ajusta si quieres una ventana más corta/larga.
const LOCK_TTL_MS = 5 * 60 * 1000;

async function acquireLock(): Promise<boolean> {
  try {
    await fs.mkdir(LOCKS_DIR, { recursive: true });
    if (fsSync.existsSync(LOCK_FILE)) {
      const stat = fsSync.statSync(LOCK_FILE);
      const age = Date.now() - stat.mtimeMs;
      // Lock fresco → no permitimos otro spawn
      if (age < LOCK_TTL_MS) return false;
    }
    // Escribimos/renovamos lock con timestamp
    fsSync.writeFileSync(LOCK_FILE, String(Date.now()), { flag: 'w' });
    return true;
  } catch {
    // Si no podemos asegurar el lock, negamos para evitar duplicados
    return false;
  }
}

async function releaseLock() {
  try { await fs.unlink(LOCK_FILE); } catch { }
}

export async function POST(req: Request) {
  try {
    // 1) Validar y normalizar payload
    const body = await req.json().catch(() => ({}));
    const rawItems = body?.items;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'items vacío' }, { status: 400 });
    }

    const items = rawItems
      .map((item: any) => {
        const correo = String(item?.correo ?? '').trim().toLowerCase();
        const nuevaClave = String(item?.nuevaClave ?? '').trim();

        const plataforma_id =
          item?.plataforma_id == null || item?.plataforma_id === ''
            ? null
            : Number(item.plataforma_id);

        const plataforma_nombre =
          item?.plataforma_nombre == null || item?.plataforma_nombre === ''
            ? null
            : String(item.plataforma_nombre).trim();

        return {
          correo,
          nuevaClave,
          plataforma_id: Number.isFinite(plataforma_id) ? plataforma_id : null,
          plataforma_nombre,
        };
      })
      .filter((item) => item.correo && item.nuevaClave);

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No hay items válidos para procesar' },
        { status: 400 }
      );
    }

    // 2) Intentar adquirir lock (AQUÍ va el candado)
    const locked = await acquireLock();
    if (!locked) {
      return NextResponse.json({ error: 'Otro envío en curso' }, { status: 429 });
    }

    // 3) Verificar script
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'notify-password-changes.js');
    try { await fs.access(scriptPath); }
    catch {
      // No tiene sentido mantener el lock si el script no existe
      await releaseLock();
      return NextResponse.json({ error: `No existe el script: ${scriptPath}` }, { status: 500 });
    }

    // 4) Preparar payload para el script
    const payloadB64 = Buffer.from(JSON.stringify({ items }), 'utf8').toString('base64');

    // 5) Lanzar proceso DETACHED (no bloquea la respuesta)
    const logDir = path.resolve(process.cwd(), '.logs');
    const child = spawn(
      process.execPath,
      [scriptPath, `--payload=${payloadB64}`],
      {
        cwd: process.cwd(),
        env: { ...process.env, NOTIFY_LOG_DIR: logDir },
        detached: true,
        windowsHide: true,
        stdio: 'ignore',
      }
    );

    // Importante: al ser detached + stdio: 'ignore', no confiamos en 'exit' para liberar.
    // Usamos TTL del lock para prevenir duplicados en ventana corta.
    child.unref();

    // 6) Responder con info útil
    const logFile = path.join(logDir, 'notify-password-changes.log');
    return NextResponse.json({ ok: true, pid: child.pid, logFile });
  } catch (e: any) {
    // En errores inesperados (antes de spawn), liberamos lock.
    await releaseLock();
    return NextResponse.json({ error: e?.message ?? 'Error lanzando script' }, { status: 500 });
  }
}
