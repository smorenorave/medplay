export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/* ===================== Utils de fechas (sin desfases por huso) ===================== */
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DD' usando componentes UTC (respeta el valor de la BD) */
function toYMDUTC(d?: Date | null): string | null {
  if (!d) return null;
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** 'YYYY-MM-DD' -> Date en medianoche UTC (no depende del huso del server) */
function parseYMDToUTCDate(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d));
}
/* ===================== Otras utils ===================== */

// clamp seguro
const clamp = (n: number | null | undefined, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
};

/* ===================== GET: lista con filtros + cursor ===================== */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = clamp(Number(searchParams.get('limit')), 1, 5000, 200);
    const cursor = searchParams.get('cursor'); // id numérico
    const plataformaRaw =
      searchParams.get('plataforma_id') ??
      searchParams.get('plataformaId') ??
      searchParams.get('pid');
    const qRaw = (searchParams.get('q') || '').trim();

    // where básico
    const where: any = {};
    if (plataformaRaw && !Number.isNaN(Number(plataformaRaw))) {
      where.plataforma_id = Number(plataformaRaw);
    }

    if (qRaw) {
      const qLower = qRaw.toLowerCase();
      const qNoSpaces = qRaw.replace(/\s+/g, '');
      where.OR = [
        { correo: { contains: qLower } }, // correos guardados en lower
        { contacto: { contains: qRaw } }, // tal cual
      ];
      if (qNoSpaces !== qRaw) where.OR.push({ contacto: { contains: qNoSpaces } });
    }

    // orden estable para cursor descendente por id
    const orderBy = { id: 'desc' as const };

    const args: any = {
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        contacto: true,
        plataforma_id: true,
        correo: true,
        contrasena: true,
        proveedor: true,
        fecha_compra: true,
        fecha_vencimiento: true,
        meses_pagados: true,
        total_pagado: true,
        total_pagado_proveedor: true,
        total_ganado: true,
        estado: true,
        comentario: true,
        usuarios: { select: { nombre: true } },
      },
    };

    // cursor opcional (paginación hacia atrás en id desc)
    if (cursor) {
      const idNum = Number(cursor);
      if (!Number.isNaN(idNum)) {
        args.cursor = { id: idNum };
        args.skip = 1;
      }
    }

    const rows = await prisma.cuentascompletas.findMany(args);

    const items = rows.map((r: any) => ({
      id: Number(r.id),
      contacto: r.contacto,
      nombre: r.usuarios?.nombre ?? null,
      plataforma_id: Number(r.plataforma_id),
      correo: r.correo ?? null,
      contrasena: r.contrasena ?? null,
      proveedor: r.proveedor ?? null,
      // ⬇⬇⬇ Fechas serializadas en LOCAL YMD (igual que en BD)
      fecha_compra: toYMDUTC(r.fecha_compra),
      fecha_vencimiento: toYMDUTC(r.fecha_vencimiento),
      meses_pagados: r.meses_pagados == null ? null : Number(r.meses_pagados),
      total_pagado: r.total_pagado == null ? null : Number(r.total_pagado),
      total_pagado_proveedor: r.total_pagado_proveedor == null ? null : Number(r.total_pagado_proveedor),
      total_ganado: r.total_ganado == null ? null : Number(r.total_ganado),
      estado: r.estado ?? null,
      comentario: r.comentario ?? null,
    }));

    // siguiente cursor: último id de esta página (orden desc => el menor id de la página)
    const nextCursor = items.length === limit ? items[items.length - 1]?.id ?? null : null;

    return NextResponse.json({ items, nextCursor }, { status: 200 });
  } catch (e: any) {
    console.error('GET /api/cuentascompletas', e);
    return NextResponse.json({ error: 'server_error', detail: e?.message ?? 'Error' }, { status: 500 });
  }
}

/* ===================== POST: crear con upsert de usuario + limpiar inventario ===================== */
export async function POST(req: Request) {
  try {
    const json = await req.json();

    // Admitimos payload plano o {cuenta, usuario}
    const flat = (json && typeof json === 'object' && 'cuenta' in json)
      ? {
          ...json.cuenta,
          contacto: json.cuenta?.contacto ?? json.usuario?.contacto,
          nombre: json.usuario?.nombre ?? null,
        }
      : json;

    // Validaciones ligeras
    const contacto = String(flat?.contacto ?? '').trim();
    const nombre = (flat?.nombre ?? null) == null ? null : String(flat.nombre).trim();
    const plataforma_id = Number(flat?.plataforma_id);
    const correo = String(flat?.correo ?? '').trim().toLowerCase(); // normaliza a minúsculas
    const contrasena = String(flat?.contrasena ?? '').trim();
    const proveedor = (flat?.proveedor ?? null) == null ? null : String(flat.proveedor).trim() || null;

    // ⬇⬇⬇ Parsear fechas en *local* para evitar que queden un día antes
    const fecha_compra = parseYMDToUTCDate(flat?.fecha_compra ?? null);
    const fecha_vencimiento = parseYMDToUTCDate(flat?.fecha_vencimiento ?? null);

    const meses_pagados =
      flat?.meses_pagados == null || Number.isNaN(Number(flat.meses_pagados))
        ? null
        : Number(flat.meses_pagados);

    const total_pagado =
      flat?.total_pagado == null || Number.isNaN(Number(flat.total_pagado))
        ? null
        : Number(flat.total_pagado);

    const total_pagado_proveedor =
      flat?.total_pagado_proveedor == null || Number.isNaN(Number(flat.total_pagado_proveedor))
        ? null
        : Number(flat.total_pagado_proveedor);

    const estado = (flat?.estado ?? null) == null ? null : String(flat.estado).trim() || null;
    const comentario = (flat?.comentario ?? null) == null ? null : String(flat.comentario).trim() || null;

    // Requisitos mínimos
    if (!contacto || !plataforma_id || !correo || !contrasena) {
      return NextResponse.json(
        { error: 'validation', detail: 'Faltan campos obligatorios (contacto, plataforma_id, correo, contrasena).' },
        { status: 400 }
      );
    }

    // Validar fechas
    if (!fecha_compra || !fecha_vencimiento) {
      return NextResponse.json(
        { error: 'bad_date', detail: 'Formato de fecha inválido. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // total_ganado según regla
    const total_ganado =
      total_pagado == null ? null : (total_pagado_proveedor == null ? total_pagado : total_pagado - total_pagado_proveedor);

    // Transacción: upsert usuario + crear cuenta + limpiar inventario
    const created = await prisma.$transaction(async (tx) => {
      // 1) upsert de usuario por contacto
      await tx.usuarios.upsert({
        where: { contacto },
        update: nombre ? { nombre } : {},
        create: { contacto, nombre: nombre ?? null },
      });

      // 2) crear cuenta completa
      const saved = await tx.cuentascompletas.create({
        data: {
          contacto,
          plataforma_id,
          correo,            // ya en minúsculas
          contrasena,
          proveedor,
          fecha_compra,
          fecha_vencimiento,
          meses_pagados,
          total_pagado,
          total_pagado_proveedor,
          total_ganado,
          estado,
          comentario,
        },
        select: {
          id: true,
          contacto: true,
          plataforma_id: true,
          correo: true,
          contrasena: true,
          proveedor: true,
          fecha_compra: true,
          fecha_vencimiento: true,
          meses_pagados: true,
          total_pagado: true,
          total_pagado_proveedor: true,
          total_ganado: true,
          estado: true,
          comentario: true,
        },
      });

      // 3) eliminar del inventario (si existe) por plataforma y correo lower
      let removedViaModel = false;
      if ((tx as any).inventario?.deleteMany) {
        try {
          await (tx as any).inventario.deleteMany({
            where: { plataforma_id, correo },
          });
          removedViaModel = true;
        } catch {
          // fallback abajo
        }
      }
      if (!removedViaModel) {
        await tx.$executeRaw`DELETE FROM inventario WHERE plataforma_id = ${plataforma_id} AND LOWER(correo) = ${correo}`;
      }

      return saved;
    });

    // Normalizamos para front (fechas *local YMD*)
    const out = {
      ...created,
      id: Number(created.id),
      plataforma_id: Number(created.plataforma_id),
      fecha_compra: toYMDUTC(created.fecha_compra),
      fecha_vencimiento: toYMDUTC(created.fecha_vencimiento),
      meses_pagados: created.meses_pagados == null ? null : Number(created.meses_pagados),
      total_pagado: created.total_pagado == null ? null : Number(created.total_pagado),
      total_pagado_proveedor: created.total_pagado_proveedor == null ? null : Number(created.total_pagado_proveedor),
      total_ganado: created.total_ganado == null ? null : Number(created.total_ganado),
    };

    return NextResponse.json(out, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/cuentascompletas error:', e);
    return NextResponse.json({ error: 'server_error', detail: e?.message ?? 'Error' }, { status: 500 });
  }
}
