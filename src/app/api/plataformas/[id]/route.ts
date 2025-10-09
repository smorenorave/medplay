// src/app/api/plataformas/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteParams = Promise<{ id: string }>;

function parseId(v: string) {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new Error('invalid-id');
  return id;
}

/* ======================= GET /api/plataformas/:id ======================= */
export async function GET(_req: Request, { params }: { params: RouteParams }) {
  try {
    const { id: idStr } = await params;
    const id = parseId(idStr);

    const row = await prisma.plataformas.findUnique({
      where: { id },
      // sin select para no romper si el modelo no tiene algun campo opcional
    });
    if (!row) return NextResponse.json({ error: 'not-found' }, { status: 404 });

    return NextResponse.json(row);
  } catch (e: any) {
    if (e?.message === 'invalid-id') {
      return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    }
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }
}

/* =================== PATCH /api/plataformas/:id =================== */
// Acepta { nombre?, cantidad_pantallas? } o { cantidadPantallas? }
export async function PATCH(req: Request, { params }: { params: RouteParams }) {
  try {
    const { id: idStr } = await params;
    const id = parseId(idStr);

    const raw = await req.json().catch(() => ({} as any));
    const data: Record<string, any> = {};

    // nombre
    if (Object.prototype.hasOwnProperty.call(raw, 'nombre')) {
      const nombre = String(raw.nombre ?? '').trim();
      if (!nombre) {
        return NextResponse.json(
          { error: 'El nombre no puede estar vacío.' },
          { status: 400 }
        );
      }
      if (nombre.length > 100) {
        return NextResponse.json(
          { error: 'Máximo 100 caracteres.' },
          { status: 400 }
        );
      }
      data.nombre = nombre;
    }

    // cantidad_pantallas (snake o camel)
    if (
      Object.prototype.hasOwnProperty.call(raw, 'cantidad_pantallas') ||
      Object.prototype.hasOwnProperty.call(raw, 'cantidadPantallas')
    ) {
      const cantRaw =
        raw.cantidad_pantallas ?? raw.cantidadPantallas ?? null;
      const cant = Number(cantRaw);
      if (!Number.isInteger(cant) || cant < 0) {
        return NextResponse.json(
          { error: 'cantidad_pantallas debe ser un entero ≥ 0' },
          { status: 400 }
        );
      }
      data.cantidad_pantallas = cant; // 👈 campo esperado en Prisma
    }

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: 'no-fields' }, { status: 400 });
    }

    const row = await prisma.plataformas.update({
      where: { id },
      data,
      // sin select para devolver todo y que veas el valor actualizado
    });

    return NextResponse.json(row);
  } catch (err: any) {
    if (err?.message === 'invalid-id') {
      return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una plataforma con ese nombre.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

// Soporte si algún proxy no permite PATCH
export async function PUT(req: Request, ctx: { params: RouteParams }) {
  return PATCH(req, ctx);
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
