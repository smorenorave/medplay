// src/app/api/pantallas/[id]/route.ts
export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/* ===================== Utils generales ===================== */
function parseId(v: string) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error('invalid-id');
  return n;
}

// DECIMAL <-> string helpers
const toDecStr = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  const n = Number(v as any);
  return Number.isNaN(n) ? null : n.toFixed(2);
};

const toNumOrNull = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v as any);
  return Number.isNaN(n) ? null : n;
};

function normalizeContactoServer(raw?: string | null) {
  return (raw ?? '').trim().replace(/\s+/g, '');
}

/**
 * Importante para evitar el error de TS/Prisma cuando `contrasena` NO es nullable:
 * - undefined  -> no tocar el campo (omit update)
 * - '' (vacío) -> guardar cadena vacía
 * - string     -> guardar el string
 * - null       -> normalizamos a '' (nunca null si schema no lo permite)
 */
const toEmptyOrString = (v: unknown): string | undefined => {
  if (v === undefined) return undefined;
  if (v === null) return '';
  const s = String(v);
  return s;
};

/* ===================== Utils de FECHA (UTC-safe) ===================== */
const pad2 = (n: number) => String(n).padStart(2, '0');

function toYMDUTC(d?: Date | null): string | null {
  if (!d) return null;
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function parseYMDToUTCDate(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d));
}

function toUTCDateOrNull(v: unknown): Date | null {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const asYMD = parseYMDToUTCDate(s);
  if (asYMD) return asYMD;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ===================== Schema (PATCH) ===================== */
const PatchSchema = z.object({
  contacto: z.string().min(1).optional(),

  // conectar/desconectar relación con cuentascompartidas
  cuenta_id: z.number().int().nullable().optional(),

  nro_pantalla: z.string().optional(),
  fecha_compra: z.string().nullable().optional(),
  fecha_vencimiento: z.string().nullable().optional(),
  meses_pagados: z.number().int().nullable().optional(),

  total_pagado: z.union([z.number(), z.string(), z.null()]).optional(),
  total_pagado_proveedor: z.union([z.number(), z.string(), z.null()]).optional(),
  total_ganado: z.union([z.number(), z.string(), z.null()]).optional(),

  estado: z.string().optional(),
  comentario: z.string().nullable().optional(),

  /**
   * OJO: el endpoint **NO** modificará `correo` en `cuentascompartidas`.
   * Puedes mandarlo, pero aquí se IGNORA. El correo solo cambia re-asignando `cuenta_id` o creando otra cuenta.
   */
  correo: z.string().nullable().optional(),

  // Sí permitimos cambiar la clave de la cuenta compartida
  contrasena: z.string().nullable().optional(),

  /** nombre se persiste en `usuarios.nombre` */
  nombre: z.string().nullable().optional(),
});

/* ===================== GET ===================== */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pid = parseId(id);

    const row = await prisma.pantallas.findUnique({
      where: { id: pid },
      include: {
        cuentascompartidas: { select: { id: true, correo: true, contrasena: true, plataforma_id: true } },
        usuarios: { select: { contacto: true, nombre: true } },
      },
    });
    if (!row) return NextResponse.json({ error: 'not-found' }, { status: 404 });

    const rowOut = {
      ...row,
      fecha_compra: toYMDUTC(row.fecha_compra),
      fecha_vencimiento: toYMDUTC(row.fecha_vencimiento),
    } as const;

    const flat = {
      row: rowOut,
      correo: row.cuentascompartidas?.correo ?? null,
      contrasena: row.cuentascompartidas?.contrasena ?? '',
      plataforma_id: row.cuentascompartidas?.plataforma_id ?? null,
    };

    return NextResponse.json(flat, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
  }
}

/* ===================== PATCH ===================== */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pid = parseId(id);

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const c = parsed.data;

    // Estado actual para cálculos de totales
    const current = await prisma.pantallas.findUnique({
      where: { id: pid },
      select: {
        cuenta_id: true,
        total_pagado: true,
        total_pagado_proveedor: true,
        total_ganado: true,
        contacto: true,
      },
    });
    if (!current) return NextResponse.json({ error: 'not-found' }, { status: 404 });

    const data: Record<string, any> = {};

    // Si cambia contacto -> asegurar usuario y usar connect
    if (c.contacto !== undefined) {
      const exists = await prisma.usuarios.findUnique({
        where: { contacto: c.contacto },
        select: { contacto: true },
      });
      if (!exists) {
        await prisma.usuarios.create({ data: { contacto: c.contacto, nombre: null } });
      }
      data.usuarios = { connect: { contacto: c.contacto } };
    }

    // Conectar/desconectar cuenta compartida
    if (c.cuenta_id !== undefined) {
      if (c.cuenta_id === null) {
        data.cuentascompartidas = { disconnect: true };
      } else {
        data.cuentascompartidas = { connect: { id: c.cuenta_id } };
      }
    }

    // Escalares locales (fechas UTC-safe)
    if (c.nro_pantalla !== undefined)       data.nro_pantalla = c.nro_pantalla;
    if (c.fecha_compra !== undefined)       data.fecha_compra = toUTCDateOrNull(c.fecha_compra);
    if (c.fecha_vencimiento !== undefined)  data.fecha_vencimiento = toUTCDateOrNull(c.fecha_vencimiento);
    if (c.meses_pagados !== undefined)      data.meses_pagados = c.meses_pagados;
    if (c.estado !== undefined)             data.estado = c.estado;
    if (c.comentario !== undefined)         data.comentario = c.comentario;

    // Totales (cálculo de total_ganado si cambian TP/TPP)
    const hasTP  = c.total_pagado !== undefined;
    const hasTPP = c.total_pagado_proveedor !== undefined;
    const hasTG  = c.total_ganado !== undefined;

    const curTP  = toNumOrNull(current.total_pagado as any);
    const curTPP = toNumOrNull(current.total_pagado_proveedor as any);

    const nextTPNum  = hasTP  ? toNumOrNull(c.total_pagado) : curTP;
    const nextTPPNum = hasTPP ? toNumOrNull(c.total_pagado_proveedor) : curTPP;

    if (hasTP)  data.total_pagado           = toDecStr(c.total_pagado);
    if (hasTPP) data.total_pagado_proveedor = toDecStr(c.total_pagado_proveedor);

    if (hasTG) {
      data.total_ganado = toDecStr(c.total_ganado);
    } else if (hasTP || hasTPP) {
      let computed: number | null = null;
      if (nextTPNum === null)       computed = null;
      else if (nextTPPNum === null) computed = nextTPNum;
      else                          computed = nextTPNum - nextTPPNum;
      data.total_ganado = toDecStr(computed);
    }

    // Si no vienen cambios en pantallas y TAMPOCO vienen contrasena/nombre/cuenta_id, no hay nada que hacer.
    const noPantallasChanges = Object.keys(data).length === 0;
    if (
      noPantallasChanges &&
      c.contrasena === undefined &&
      c.nombre === undefined &&
      c.cuenta_id === undefined
      // `correo` no cuenta: aquí está PROHIBIDO modificarlo
    ) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    // Actualizar pantallas SOLO si hay cambios en ella
    let updated = null as unknown as {
      cuentascompartidas: { id: number | null } | null;
      usuarios: { contacto: string | null } | null;
    };

    if (!noPantallasChanges) {
      updated = await prisma.pantallas.update({
        where: { id: pid },
        data,
        include: {
          cuentascompartidas: { select: { id: true, correo: true, contrasena: true, plataforma_id: true } },
          usuarios: { select: { contacto: true, nombre: true } },
        },
      });
    } else {
      // No hay cambios en pantallas -> traemos la fila para poder tocar relaciones
      const row = await prisma.pantallas.findUnique({
        where: { id: pid },
        include: {
          cuentascompartidas: { select: { id: true, correo: true, contrasena: true, plataforma_id: true } },
          usuarios: { select: { contacto: true, nombre: true } },
        },
      });
      if (!row) return NextResponse.json({ error: 'not-found' }, { status: 404 });
      updated = row as any;
    }

    // ====== ACTUALIZAR RELACIONES ======
    // 1) Cuentas compartidas: SOLO contrasena (correo está prohibido aquí)
    const hasCuentaRelacion = !!updated.cuentascompartidas?.id;
    if (hasCuentaRelacion && c.contrasena !== undefined) {
      const normalized = toEmptyOrString(c.contrasena);
      if (normalized !== undefined) {
        await prisma.cuentascompartidas.update({
          where: { id: updated.cuentascompartidas!.id! },
          data: { contrasena: normalized }, // ¡NO correo!
        });
      }
    }

    // 2) Usuarios: nombre
    if (c.nombre !== undefined) {
      const newNombre =
        c.nombre == null
          ? null
          : (String(c.nombre).trim() === '' ? null : String(c.nombre).trim());

      const usuarioContacto = updated.usuarios?.contacto;
      if (usuarioContacto) {
        await prisma.usuarios.update({
          where: { contacto: usuarioContacto },
          data: { nombre: newNombre },
        });
      }
    }

    // Traer de nuevo con los últimos datos de la relación (y normalizar fechas)
    const finalRow = await prisma.pantallas.findUnique({
      where: { id: pid },
      include: {
        cuentascompartidas: { select: { id: true, correo: true, contrasena: true, plataforma_id: true } },
        usuarios: { select: { contacto: true, nombre: true } },
      },
    });

    const finalOut = finalRow && {
      ...finalRow,
      fecha_compra: toYMDUTC(finalRow!.fecha_compra),
      fecha_vencimiento: toYMDUTC(finalRow!.fecha_vencimiento),
    };

    const flat = {
      row: finalOut,
      correo: finalOut?.cuentascompartidas?.correo ?? null,
      contrasena: finalOut?.cuentascompartidas?.contrasena ?? '',
      plataforma_id: finalOut?.cuentascompartidas?.plataforma_id ?? null,
    };

    return NextResponse.json(flat, { status: 200 });
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'not-found' }, { status: 404 });
    if (e?.code === 'P2003') return NextResponse.json({ error: 'foreign_key_violation' }, { status: 409 });
    if (e?.code === 'P2002') return NextResponse.json({ error: 'unique_violation' }, { status: 409 });
    if (e?.message === 'invalid-id') return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

/* ===================== PUT (reusa PATCH) ===================== */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(req, ctx);
}

/* ===================== DELETE ===================== */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pid = parseId(id);

    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.pantallas.findUnique({
        where: { id: pid },
        select: { id: true, cuenta_id: true, contacto: true },
      });
      if (!before) {
        return { deleted: false, cuenta_deleted: false, usuario_deleted: false };
      }

      const cuentaId = before.cuenta_id ?? null;
      const contactoRaw = before.contacto ?? '';
      const contactoNorm = normalizeContactoServer(contactoRaw);

      await tx.pantallas.delete({ where: { id: pid } });

      let cuentaDeleted = false;
      if (cuentaId != null) {
        const restantes = await tx.pantallas.count({ where: { cuenta_id: cuentaId } });
        if (restantes === 0) {
          await tx.cuentascompartidas.delete({ where: { id: cuentaId } });
          cuentaDeleted = true;
        }
      }

      const refsPantallas = await tx.pantallas.count({
        where: { OR: [{ contacto: contactoRaw }, { contacto: contactoNorm }] },
      });
      const refsCuentasCompletas = await tx.cuentascompletas.count({
        where: { OR: [{ contacto: contactoRaw }, { contacto: contactoNorm }] },
      });

      let usuarioDeleted = false;
      if (refsPantallas + refsCuentasCompletas === 0) {
        const delRes = await tx.usuarios.deleteMany({
          where: { OR: [{ contacto: contactoRaw }, { contacto: contactoNorm }] },
        });
        usuarioDeleted = delRes.count > 0;
      }

      return { deleted: true, cuenta_deleted: cuentaDeleted, usuario_deleted: usuarioDeleted };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    if (e?.message === 'invalid-id') {
      return NextResponse.json({ error: 'invalid-id' }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message ?? 'Error eliminando pantalla' }, { status: 500 });
  }
}
