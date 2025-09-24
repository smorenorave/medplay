// src/app/api/cuentasvencidas/route.ts
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { items } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items vacío' }, { status: 400 });
    }

    const scriptPath = path.resolve(process.cwd(), 'scripts', 'notify-password-changes.js');
    try { await fs.access(scriptPath); }
    catch { return NextResponse.json({ error: `No existe el script: ${scriptPath}` }, { status: 500 }); }

    const payloadB64 = Buffer.from(JSON.stringify({ items }), 'utf8').toString('base64');

    // Carpeta de logs fija (cámbiala si quieres)
    const logDir = path.resolve(process.cwd(), '.logs');
    const child = spawn(
      process.execPath,
      [scriptPath, `--payload=${payloadB64}`],
      {
        cwd: process.cwd(),
        env: { ...process.env, NOTIFY_LOG_DIR: logDir }, // <-- la usará tu script
        detached: true,
        windowsHide: true,
        stdio: 'ignore',
      }
    );
    child.unref();

    const logFile = path.join(logDir, 'notify-password-changes.log');
    return NextResponse.json({ ok: true, pid: child.pid, logFile });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Error lanzando script' }, { status: 500 });
  }
}
