// src/app/api/plataformas/[id]/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function parseId(v: string) {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new Error('invalid-id');
  return id;
}

// Helper para leer params que pueden venir como Promise (Next.js App Router)
async function getParams<T extends object>(ctx: { params: T } | { params: Promise<T> }): Promise<T> {
  // @ts-ignore – comprobamos en runtime
  return 'then' in ctx.params ? await (ctx as any).params : (ctx as any).params;
}

/** GET /api/plataformas/:id */
export async function GET(
  _req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await getParams(ctx);
    const id = parseId(idStr);

    const row = await prisma.plataformas.findUnique({
      where: { id },
      select: { id: true, nombre: true },
    });
    if (!row) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json(row, { status: 200 });
  } catch (e: any) {
    if (e?.message === 'invalid-id') return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    return NextResponse.json({ error: 'read_failed' }, { status: 500 });
  }
}

/** PATCH /api/plataformas/:id  Body: { nombre } */
export async function PATCH(
  req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await getParams(ctx);
    const id = parseId(idStr);

    const body = await req.json().catch(() => ({}));
    const nombre = String(body?.nombre ?? '').trim();

    if (!nombre) return NextResponse.json({ error: 'El nombre no puede estar vacío.' }, { status: 400 });
    if (nombre.length > 100) return NextResponse.json({ error: 'Máximo 100 caracteres.' }, { status: 400 });

    const updated = await prisma.plataformas.update({
      where: { id },
      data: { nombre },
      select: { id: true, nombre: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    if (err?.message === 'invalid-id') return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    if (err?.code === 'P2025') return NextResponse.json({ error: 'not-found' }, { status: 404 });
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Ya existe una plataforma con ese nombre.' }, { status: 409 });
    console.error('PATCH /api/plataformas/[id] error:', err);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

/** DELETE /api/plataformas/:id */
export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await getParams(ctx);
    const id = parseId(idStr);

    // Comprobamos relaciones antes de intentar borrar
    const [nCompartidas, nCompletas] = await prisma.$transaction([
      prisma.cuentascompartidas.count({ where: { plataforma_id: id } }),
      prisma.cuentascompletas.count({ where: { plataforma_id: id } }),
    ]);

    if (nCompartidas > 0 || nCompletas > 0) {
      return NextResponse.json(
        { error: 'has-relations', refs: { cuentascompartidas: nCompartidas, cuentascompletas: nCompletas } },
        { status: 409 }
      );
    }

    await prisma.plataformas.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    if (err?.message === 'invalid-id') return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    if (err?.code === 'P2025') return NextResponse.json({ error: 'not-found' }, { status: 404 });
    console.error('DELETE /api/plataformas/[id] error:', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
