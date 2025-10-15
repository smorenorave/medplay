// src/app/api/proton/notify/route.ts
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { correo, clave } = body || {};

    if (
      !correo ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo)) ||
      !clave ||
      typeof clave !== 'string'
    ) {
      return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 });
    }

    // Ruta relativa al proyecto (como en cuentasvencidas)
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'notify-password-changes-proton.js');
    try {
      await fs.access(scriptPath);
    } catch {
      return NextResponse.json({ ok: false, error: `No existe el script: ${scriptPath}` }, { status: 500 });
    }

    // Empaquetar payload en base64 para pasarlo en una sola arg
    const payloadB64 = Buffer.from(JSON.stringify({ correo, clave }), 'utf8').toString('base64');

    // Carpeta de logs (igual patrón)
    const logDir = path.resolve(process.cwd(), '.logs');

    // Lanzar proceso en background (detached) usando el mismo node de Next
    const child = spawn(
      process.execPath,
      [scriptPath, `--payload=${payloadB64}`],
      {
        cwd: process.cwd(),
        env: { ...process.env, NOTIFY_LOG_DIR: logDir }, // tu script puede leer esta var
        detached: true,
        windowsHide: true,
        stdio: 'ignore', // no mantenemos pipes abiertos
      }
    );

    child.unref();

    const logFile = path.join(logDir, 'notify-password-changes-proton.log');
    return NextResponse.json({ ok: true, pid: child.pid, logFile });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Error lanzando script' }, { status: 500 });
  }
}
