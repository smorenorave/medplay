// src/app/api/cuentascompartidas/[id]/route.ts
export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/* helpers */
function parseId(v: string) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error('invalid-id');
  return n;
}

const PatchSchema = z.object({
  correo: z.string().email().optional(),
  contrasena: z.string().nullable().optional(), // permite null o string
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cid = parseId(id);
    const row = await prisma.cuentascompartidas.findUnique({ where: { id: cid } });
    if (!row) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cid = parseId(id);

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const c = parsed.data;

    const data: Record<string, any> = {};
    if (c.correo !== undefined) data.correo = c.correo;
    if (c.contrasena !== undefined) data.contrasena = c.contrasena === '' ? null : c.contrasena;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    const updated = await prisma.cuentascompartidas.update({
      where: { id: cid },
      data,
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    if (e?.code === 'P2002') {
      // p.ej. unique(correo, plataforma_id)
      return NextResponse.json({ error: 'unique_violation' }, { status: 409 });
    }
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

// opcional: PUT como alias de PATCH
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    // No permitir borrar si aún tiene pantallas asociadas
    const refs = await prisma.pantallas.count({ where: { cuenta_id: id } });
    if (refs > 0) {
      return NextResponse.json(
        { error: 'No se puede borrar: existen pantallas asociadas' },
        { status: 409 }
      );
    }

    await prisma.cuentascompartidas.delete({ where: { id } });
    return NextResponse.json({ deleted: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Error eliminando cuenta' }, { status: 500 });
  }
}
