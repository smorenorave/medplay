// src/app/api/cuentascompartidas/[id]/route.ts
export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/* ===========================================================
   Helpers
=========================================================== */
function parseId(v: string) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error('invalid-id');
  return n;
}

/** PATCH payload válido:
 * - correo?: string (email)
 * - contrasena?: string | null  ('' -> null)
 * - cuenta_caida?: boolean
 * - plataforma_id?: number | null
 */
const PatchSchema = z.object({
  correo: z.string().email().optional(),
  contrasena: z.string().nullable().optional(),
  cuenta_caida: z.boolean().optional(),
  plataforma_id: z.number().int().nullable().optional(), // ✅ agregado
});

/* ===========================================================
   GET /api/cuentascompartidas/[id]
=========================================================== */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cid = parseId(id);

    const row = await prisma.cuentascompartidas.findUnique({
      where: { id: cid },
    });

    if (!row)
      return NextResponse.json({ error: 'not-found' }, { status: 404 });

    return NextResponse.json(row, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
  }
}

/* ===========================================================
   PATCH /api/cuentascompartidas/[id]
=========================================================== */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cid = parseId(id);

    const url = req.nextUrl;
    const applyToSameEmail =
      url.searchParams.get('applyToSameEmail')?.toLowerCase() === '1' ||
      url.searchParams.get('applyToSameEmail')?.toLowerCase() === 'true';

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const c = parsed.data;

    /* ===================== Actualización normal ===================== */
    const data: Record<string, any> = {};

    if (c.correo !== undefined)
      data.correo = String(c.correo).trim().toLowerCase();

    if (c.contrasena !== undefined)
      data.contrasena = c.contrasena === '' ? null : c.contrasena;

    if (c.cuenta_caida !== undefined)
      data.cuenta_caida = c.cuenta_caida;

    if (c.plataforma_id !== undefined)
      data.plataforma_id = c.plataforma_id;

    // Si no se mandó ningún campo, devuelve error
    if (Object.keys(data).length === 0 && !applyToSameEmail) {
      return NextResponse.json(
        { error: 'no_fields_to_update' },
        { status: 400 }
      );
    }

    /* ===================== MODO BULK (propagar cuenta_caida) ===================== */
    if (applyToSameEmail) {
      if (c.cuenta_caida === undefined) {
        return NextResponse.json(
          { error: 'missing_cuenta_caida_for_bulk' },
          { status: 400 }
        );
      }

      const current = await prisma.cuentascompartidas.findUnique({
        where: { id: cid },
        select: { correo: true },
      });

      if (!current?.correo) {
        return NextResponse.json(
          { error: 'base_row_without_email' },
          { status: 409 }
        );
      }

      const bulkRes = await prisma.cuentascompartidas.updateMany({
        where: { correo: current.correo },
        data: { cuenta_caida: c.cuenta_caida },
      });

      // Actualiza también el propio registro si trae correo o contraseña
      const extraData: Record<string, any> = {};
      if (c.correo !== undefined)
        extraData.correo = String(c.correo).trim().toLowerCase();
      if (c.contrasena !== undefined)
        extraData.contrasena = c.contrasena === '' ? null : c.contrasena;

      let updatedSelf = null;
      if (Object.keys(extraData).length > 0) {
        updatedSelf = await prisma.cuentascompartidas.update({
          where: { id: cid },
          data: extraData,
        });
      }

      return NextResponse.json({
        ok: true,
        mode: 'bulk-by-email',
        correo: current.correo,
        updatedCount: bulkRes.count,
        updatedSelf,
      });
    }

    /* ===================== UPDATE NORMAL ===================== */
    const updated = await prisma.cuentascompartidas.update({
      where: { id: cid },
      data,
      select: {
        id: true,
        correo: true,
        plataforma_id: true,
        contrasena: true,
        cuenta_caida: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'P2025')
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    if (e?.code === 'P2002')
      return NextResponse.json({ error: 'unique_violation' }, { status: 409 });
    if (e?.message === 'invalid-id')
      return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    return NextResponse.json({ error: 'update_failed', detail: e?.message }, { status: 500 });
  }
}

/* ===========================================================
   PUT /api/cuentascompartidas/[id]
=========================================================== */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(req, ctx);
}

/* ===========================================================
   DELETE /api/cuentascompartidas/[id]
=========================================================== */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
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
    return NextResponse.json(
      { error: e?.message ?? 'Error eliminando cuenta' },
      { status: 500 }
    );
  }
}
