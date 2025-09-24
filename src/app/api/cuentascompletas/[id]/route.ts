// app/api/cuentascompletas/[id]/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { normalizeContacto } from '@/lib/strings';

/* ============ Tipos / Ctx (params es asíncrono) ============ */
type RouteCtx = { params: Promise<{ id: string }> };

/* ============ Utils ============ */
function parseId(v: string) {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new Error('invalid-id');
  return id;
}

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

/* ==== Zod & normalización ==== */
const DateLike = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD
  .or(z.string().datetime())    // ISO
  .nullable()
  .optional();

const numOrNull = (v: any): number | null =>
  v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v);

/**
 * Normaliza alias desde el cliente al esquema canónico antes de validar con Zod.
 * Acepta: total_pagado_proveedor | pago_total_proveedor | pagado_proveedor | total_pagado_proovedor (typo)
 * y total_ganado | ganado. Contraseña '' => null.
 */
function normalizeUpdateBody(raw: any) {
  const provAlias =
    raw?.total_pagado_proveedor ??
    raw?.pago_total_proveedor ??
    raw?.pagado_proveedor ??
    raw?.total_pagado_proovedor; // typo común

  const ganadoAlias = raw?.total_ganado ?? raw?.ganado;

  return {
    contacto: typeof raw?.contacto === 'string' ? raw.contacto.trim() : raw?.contacto,
    nombre: typeof raw?.nombre === 'string' ? raw.nombre.trim() : raw?.nombre,
    plataforma_id: raw?.plataforma_id !== undefined ? Number(raw.plataforma_id) : undefined,

    correo: typeof raw?.correo === 'string' ? raw.correo.trim() : raw?.correo,
    contrasena: typeof raw?.contrasena === 'string' && raw.contrasena.trim() === '' ? null : raw?.contrasena,
    proveedor: raw?.proveedor ?? null,
    fecha_compra: raw?.fecha_compra ?? null,
    fecha_vencimiento: raw?.fecha_vencimiento ?? null,
    meses_pagados: raw?.meses_pagados === '' ? null : raw?.meses_pagados,

    total_pagado: numOrNull(raw?.total_pagado),
    total_pagado_proveedor: numOrNull(provAlias),
    total_ganado: numOrNull(ganadoAlias), // el servidor puede ignorarlo si recomputa

    estado: raw?.estado ?? null,
    comentario: raw?.comentario ?? null,
  };
}

/* ============ Zod (parcial para PATCH/PUT) ============ */
const CCUpdatePartial = z.object({
  contacto: z.string().min(1).optional(),            // cambiar el contacto (usuario) asociado
  nombre: z.string().nullable().optional(),          // opcional para actualizar/crear usuario
  plataforma_id: z.coerce.number().int().positive().optional(),

  correo: z.string().email().optional(),
  contrasena: z.string().min(7).nullable().optional(),
  proveedor: z.string().nullable().optional(),
  fecha_compra: DateLike,
  fecha_vencimiento: DateLike,
  meses_pagados: z.coerce.number().int().nullable().optional(),

  total_pagado: z.coerce.number().nullable().optional(),
  total_pagado_proveedor: z.coerce.number().nullable().optional(),

  // Nota: el servidor recomputa total_ganado si cambian totales; si no cambian, no modifica.
  total_ganado: z.coerce.number().nullable().optional(),

  estado: z.string().nullable().optional(),
  comentario: z.string().nullable().optional(),
});

/* ============ Helpers de respuesta ============ */
function shapeRow(r: any) {
  const totalProv =
    r.total_pagado_proveedor ?? (r as any).total_pagado_proveedor ?? null;

  return {
    ...r,
    id: typeof r.id === 'bigint' ? Number(r.id) : r.id,
    plataforma_id: typeof r.plataforma_id === 'bigint' ? Number(r.plataforma_id) : r.plataforma_id,
    meses_pagados: r.meses_pagados == null ? null : Number(r.meses_pagados),
    total_pagado: r.total_pagado == null ? null : Number(r.total_pagado),
    total_pagado_proveedor: totalProv == null ? null : Number(totalProv),
    total_ganado: r.total_ganado == null ? null : Number(r.total_ganado),
    // ⬇⬇⬇ Serializamos en LOCAL YMD para que el front muestre el mismo día que en BD
    fecha_compra: toYMDUTC(r.fecha_compra),
    fecha_vencimiento: toYMDUTC(r.fecha_vencimiento),
    // nombre “aplanado”
    nombre: r.usuarios?.nombre ?? null,
  };
}

/* ============ GET /[id] ============ */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);

    const row = await prisma.cuentascompletas.findUnique({
      where: { id },
      include: { usuarios: { select: { nombre: true } } },
    });
    if (!row) return NextResponse.json({ error: 'not-found' }, { status: 404 });

    return NextResponse.json(shapeRow(row), { status: 200 });
  } catch (e: any) {
    if (e?.message === 'invalid-id') {
      return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    }
    return NextResponse.json({ error: 'get_failed' }, { status: 500 });
  }
}

/* ============ PATCH /[id] ============ */
export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);

    // Traer la fila actual con usuario (para cálculos/decisiones)
    const current = await prisma.cuentascompletas.findUnique({
      where: { id },
      include: { usuarios: { select: { contacto: true, nombre: true } } },
    });
    if (!current) return NextResponse.json({ error: 'not-found' }, { status: 404 });

    // Normalizar + validar
    const raw = await req.json();
    const normalized = normalizeUpdateBody(raw);
    const parsed = CCUpdatePartial.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const c = parsed.data;

    // Validación opcional de plataforma
    if (c.plataforma_id !== undefined) {
      const plat = await prisma.plataformas.findUnique({ where: { id: c.plataforma_id } });
      if (!plat) return NextResponse.json({ error: 'platform-not-found' }, { status: 404 });
    }

    // Valores actuales para cálculo de total_ganado si no se envían
    const curTotalPagado = current.total_pagado == null ? null : Number(current.total_pagado as any);
    const curTotalProv =
      (current as any).total_pagado_proveedor == null
        ? null
        : Number((current as any).total_pagado_proveedor);

    const nextTotalPagado = c.total_pagado !== undefined ? c.total_pagado : curTotalPagado;
    const nextTotalProv = c.total_pagado_proveedor !== undefined ? c.total_pagado_proveedor : curTotalProv;

    // Recalcular total_ganado si se envió alguno de los totales
    const shouldRecomputeGain =
      Object.prototype.hasOwnProperty.call(c, 'total_pagado') ||
      Object.prototype.hasOwnProperty.call(c, 'total_pagado_proveedor');

    const computedTotalGanado =
      shouldRecomputeGain
        ? nextTotalPagado !== null
          ? nextTotalProv !== null
            ? nextTotalPagado - nextTotalProv
            : nextTotalPagado
          : null
        : undefined; // sin cambios

    const oldContacto = current.usuarios?.contacto ?? null;
    const wantsChangeContacto = c.contacto !== undefined && c.contacto !== oldContacto;

    // Datos escalares para cuentascompletas (con fechas *locales*)
    const scalarData: Record<string, any> = {
      ...(c.correo !== undefined ? { correo: c.correo } : {}),
      ...(c.contrasena !== undefined ? { contrasena: c.contrasena } : {}),
      ...(c.proveedor !== undefined ? { proveedor: c.proveedor } : {}),
      ...(c.fecha_compra !== undefined
        ? { fecha_compra: parseYMDToUTCDate(c.fecha_compra as any) }
        : {}),
      ...(c.fecha_vencimiento !== undefined
        ? { fecha_vencimiento: parseYMDToUTCDate(c.fecha_vencimiento as any) }
        : {}),
      ...(c.meses_pagados !== undefined ? { meses_pagados: c.meses_pagados } : {}),
      ...(c.total_pagado !== undefined ? { total_pagado: c.total_pagado } : {}),
      ...(c.total_pagado_proveedor !== undefined ? { total_pagado_proveedor: c.total_pagado_proveedor } : {}),
      ...(computedTotalGanado !== undefined ? { total_ganado: computedTotalGanado } : {}),
      ...(c.estado !== undefined ? { estado: c.estado } : {}),
      ...(c.comentario !== undefined ? { comentario: c.comentario } : {}),
      ...(c.plataforma_id !== undefined ? { plataforma_id: c.plataforma_id } : {}),
    };

    // ===== Caso 1: NO cambia el contacto =====
    if (!wantsChangeContacto || !oldContacto) {
      await prisma.$transaction(async (tx) => {
        if (Object.keys(scalarData).length > 0) {
          await tx.cuentascompletas.update({ where: { id }, data: scalarData });
        }
        // si viene nombre, actualizar el del usuario actual
        if (oldContacto && c.nombre !== undefined) {
          await tx.usuarios.update({
            where: { contacto: oldContacto },
            data: { nombre: c.nombre },
          });
        }
      });

      const fresh = await prisma.cuentascompletas.findUnique({
        where: { id },
        include: { usuarios: { select: { contacto: true, nombre: true } } },
      });
      return NextResponse.json(fresh ? shapeRow(fresh) : null, { status: 200 });
    }

    // ===== Caso 2: SÍ cambia el contacto =====
    const newContacto = c.contacto!;

    // ¿cuántas cuentas referencian al usuario anterior?
    const refCount = await prisma.cuentascompletas.count({
      where: { usuarios: { contacto: oldContacto ?? '' } },
    });

    // ¿existe ya un usuario con el contacto nuevo?
    const targetUser = await prisma.usuarios.findUnique({ where: { contacto: newContacto } });

    if (refCount === 1 && !targetUser) {
      // renombrar usuario actual y actualizar cuenta
      await prisma.$transaction(async (tx) => {
        await tx.usuarios.update({
          where: { contacto: oldContacto ?? '' },
          data: {
            contacto: newContacto,
            ...(c.nombre !== undefined ? { nombre: c.nombre } : {}),
          },
        });
        if (Object.keys(scalarData).length > 0) {
          await tx.cuentascompletas.update({ where: { id }, data: scalarData });
        }
      });
    } else {
      // conectar a usuario existente o crear uno nuevo
      await prisma.$transaction(async (tx) => {
        if (!targetUser) {
          await tx.usuarios.create({
            data: { contacto: newContacto, nombre: c.nombre ?? null },
          });
        }
        await tx.cuentascompletas.update({
          where: { id },
          data: {
            ...scalarData,
            usuarios: { connect: { contacto: newContacto } },
          },
        });

        // limpiar usuario anterior si quedó sin referencias
        const remaining = await tx.cuentascompletas.count({
          where: { usuarios: { contacto: oldContacto ?? '' } },
        });
        if (remaining === 0 && oldContacto) {
          await tx.usuarios.delete({ where: { contacto: oldContacto } }).catch(() => {});
        }
      });
    }

    const fresh = await prisma.cuentascompletas.findUnique({
      where: { id },
      include: { usuarios: { select: { contacto: true, nombre: true } } },
    });
    return NextResponse.json(fresh ? shapeRow(fresh) : null, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'relation-or-row-not-found' }, { status: 404 });
    if (e?.code === 'P2003') return NextResponse.json({ error: 'foreign_key_violation' }, { status: 409 });
    if (e?.code === 'P2002') return NextResponse.json({ error: 'unique_violation' }, { status: 409 });
    if (e?.message === 'invalid-id') return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

/* ============ PUT /[id] (reusa PATCH) ============ */
export async function PUT(req: Request, ctx: RouteCtx) {
  return PATCH(req, ctx);
}

/* ============ DELETE /[id] ============ */
export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    const { id: idStr } = await ctx.params;
    const id = parseId(idStr);

    // Traer contacto del usuario relacionado ANTES de borrar
    const row = await prisma.cuentascompletas.findUnique({
      where: { id },
      include: { usuarios: { select: { contacto: true } } },
    });
    if (!row) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    const rawContacto: string | null = row.usuarios?.contacto ?? null;

    const { searchParams } = new URL(req.url);
    const cascadeParam = (searchParams.get('cascade') || '').toLowerCase();
    const cascade = cascadeParam === '1' || cascadeParam === 'true' || cascadeParam === 'yes';

    const meta: Record<string, any> = {};

    await prisma.$transaction(async (tx) => {
      // 1) Borrar la cuenta completa
      await tx.cuentascompletas.delete({ where: { id } });

      if (!cascade || !rawContacto) return;

      // 2) Si se pide cascade: evaluar si el contacto quedó huérfano
      const norm = normalizeContacto(rawContacto);

      const [countPantallas, countCuentas] = await Promise.all([
        tx.pantallas.count({ where: { contacto: rawContacto } }),
        tx.cuentascompletas.count({ where: { usuarios: { contacto: rawContacto } } }),
      ]);

      // Si no quedan referencias en NINGUNA tabla, eliminar de usuarios
      if (countPantallas + countCuentas === 0) {
        const del = await tx.usuarios.deleteMany({
          where: {
            OR: [{ contacto: rawContacto }, { contacto: norm }],
          },
        });
        if (del.count > 0) meta.removedUsuario = true;
      }
    });

    return NextResponse.json({ ok: true, meta }, { status: 200 });
  } catch (e: any) {
    if (e?.message === 'invalid-id') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }
    console.error('DELETE /api/cuentascompletas/[id] failed:', e);
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
  }
}
