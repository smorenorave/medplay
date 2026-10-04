import { deleteEmailForRecord } from "@/lib/deleteEmailForRecord";
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getAuthenticatedAdminId } from '@/lib/adminSession';
import { archiveDeletedAccount } from '@/lib/deletionHistory';

const Patch = z.object({
  plataforma_id: z.coerce.number().int().positive().optional(),
  correo: z.string().email().optional(),
  clave: z.string().trim().optional().nullable(),
});

/* ---------- PATCH: editar ---------- */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const raw = await _req.json();
    const parsed = Patch.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const b = parsed.data;

    const data: any = {};
    if (b.plataforma_id != null) data.plataforma_id = b.plataforma_id;
    if (b.correo != null) data.correo = b.correo.trim().toLowerCase();
    if ('clave' in b) data.clave = b.clave ?? null;

    const upd = await prisma.inventario.update({
      where: { id },
      data,
      select: { id: true, plataforma_id: true, correo: true, clave: true },
    });

    return NextResponse.json(
      {
        id: Number((upd as any).id),
        plataforma_id: Number((upd as any).plataforma_id),
        correo: upd.correo,
        clave: upd.clave,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('PATCH /api/inventario/[id]', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

/* ---------- DELETE ---------- */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // 👈 params ahora es async
) {
  try {
    const { id } = await ctx.params;
    const globalDeletion = await deleteEmailForRecord(req, { tipo: "inventario", id: id });
    if (globalDeletion) return globalDeletion; // 👈 OBLIGATORIO en tu versión de Next
    const idNum = Number(id);

    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: "validation", detail: "id inválido" }, { status: 400 });
    }

    const adminId = await getAuthenticatedAdminId(req);
    await prisma.$transaction(async (tx) => {
      const row = await tx.inventario.findUnique({
        where: { id: idNum },
        include: { plataformas: { select: { nombre: true } } },
      });
      if (!row) return;

      await archiveDeletedAccount(tx, {
        plataformaId: row.plataforma_id,
        plataforma: row.plataformas.nombre,
        correo: row.correo,
        clave: row.clave,
        tipoRegistro: 'INVENTARIO',
        tipoEliminacion: 'INVENTARIO',
        identificadorOriginal: row.id,
        eliminadoPorAdminId: adminId,
      });
      await tx.inventario.delete({ where: { id: idNum } });
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("DELETE /api/inventario/[id]", e);
    return NextResponse.json(
      { error: "server_error", detail: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}
