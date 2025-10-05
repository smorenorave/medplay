// src/app/api/pantallas/stamp/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Hash FNV-1a 32-bit para construir un sello numérico estable. */
function hash32(s: string): number {
  let h = 0x811c9dc5 >>> 0; // offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return h >>> 0; // unsigned
}

/**
 * Devuelve { stamp: number } que cambia si hay inserciones/eliminaciones
 * o (en general) modificaciones en pantallas / cuentascompartidas / usuarios,
 * sin depender de campos updated_at ni de usuarios.id.
 */
export async function GET() {
  try {
    const [
      pLast, pCount,
      cLast, cCount,
      uTopByContacto, uCount,
    ] = await Promise.all([
      prisma.pantallas.findFirst({ select: { id: true }, orderBy: { id: 'desc' } }),
      prisma.pantallas.count(),

      prisma.cuentascompartidas.findFirst({ select: { id: true }, orderBy: { id: 'desc' } }),
      prisma.cuentascompartidas.count(),

      // usuarios NO tiene id: usamos el mayor contacto lexicográfico (string)
      prisma.usuarios.findFirst({ select: { contacto: true }, orderBy: { contacto: 'desc' } }),
      prisma.usuarios.count(),
    ]);

    const pMaxId = pLast?.id ?? 0;
    const cMaxId = cLast?.id ?? 0;
    const uTopContacto = uTopByContacto?.contacto ?? '';

    // Armamos una firma y la hasheamos a 32 bits sin signo
    const signature = [
      'P', pMaxId, pCount,
      'C', cMaxId, cCount,
      'U', uCount, uTopContacto,
    ].join('|');

    const stamp = hash32(signature);

    return NextResponse.json({ stamp }, { status: 200 });
  } catch {
    // No rompas el cliente si falla
    return NextResponse.json({ stamp: 0 }, { status: 200 });
  }
}
