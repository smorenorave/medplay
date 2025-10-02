// src/app/api/pantallas/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/* ===================== Utils de fechas (sin desfases) ===================== */
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DD' usando componentes UTC (evita TZ shift) */
function toYMDUTC(d?: Date | null): string | null {
  if (!d) return null;
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Parser tolerante -> Date en medianoche UTC */
function parseDateLooseToUTC(input?: unknown): Date | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;

  // 1) YYYY-MM-DD
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    return new Date(Date.UTC(y, mo - 1, d));
  }

  // 2) ISO (YYYY-MM-DDTHH:mm:ssZ, etc.) -> tomamos solo la fecha
  m = /^(\d{4})-(\d{2})-(\d{2})T/.exec(s);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    return new Date(Date.UTC(y, mo - 1, d));
  }

  // 3) DD/MM/YYYY
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    return new Date(Date.UTC(y, mo - 1, d));
  }

  // 4) YYYY/MM/DD
  m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    return new Date(Date.UTC(y, mo - 1, d));
  }

  // 5) Timestamp
  const n = Number(s);
  if (!Number.isNaN(n) && s.length >= 8) {
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) {
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
  }

  // 6) Fallback general
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  return null;
}

/* ===================== Otras utils ===================== */
const normalizeContacto = (s: string) => (s ?? '').replace(/\s+/g, '');
const normalizeEmail = (s: string) => (s ?? '').trim().toLowerCase();
const toDecStr = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  const n = Number(v as any);
  return Number.isNaN(n) ? null : n.toFixed(2);
};
const clamp = (n: number | null | undefined, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
};

/* ========================================================================
 * GET /api/pantallas
 *  - Filtros: plataforma_id | plataformaId | pid, cuenta_id, correo, q
 *  - Cursor:  cursor=<id>&limit=300 (máx 5000)
 *  - Orden:   fecha_vencimiento asc, id asc
 * ======================================================================== */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = clamp(Number(searchParams.get('limit')), 1, 5000, 300);
    const cursorRaw = searchParams.get('cursor');

    const plataformaRaw =
      searchParams.get('plataforma_id') ??
      searchParams.get('plataformaId') ??
      searchParams.get('pid');

    const cuentaIdRaw = searchParams.get('cuenta_id');
    const correoRaw = searchParams.get('correo');
    const qRaw = (searchParams.get('q') || '').trim();

    const cursor = cursorRaw ? Number(cursorRaw) : null;
    if (cursorRaw && Number.isNaN(cursor!)) {
      return NextResponse.json(
        { error: 'bad_request', detail: 'Parámetros inválidos: cursor.' },
        { status: 400 }
      );
    }

    const where: any = {};

    // Filtro por cuenta
    if (cuentaIdRaw && !Number.isNaN(Number(cuentaIdRaw))) {
      where.cuenta_id = Number(cuentaIdRaw);
    }

    // Filtros sobre la relación cuentascompartidas
    const ccWhere: any = {};
    if (plataformaRaw && !Number.isNaN(Number(plataformaRaw))) {
      ccWhere.plataforma_id = Number(plataformaRaw);
    }
    if (correoRaw) {
      ccWhere.correo = { contains: normalizeEmail(correoRaw) };
    }
    if (Object.keys(ccWhere).length > 0) {
      where.cuentascompartidas = ccWhere;
    }

    // Búsqueda libre
    if (qRaw) {
      const qLower = qRaw.toLowerCase();
      const qNoSpaces = qRaw.replace(/\s+/g, '');
      where.OR = [
        { contacto: { contains: qRaw } },
        { contacto: { contains: qNoSpaces } },
        { nro_pantalla: { contains: qRaw } },
        { cuentascompartidas: { correo: { contains: qLower } } },
      ];
    }

    const orderBy = [{ fecha_vencimiento: 'asc' as const }, { id: 'asc' as const }];

    const args: Parameters<typeof prisma.pantallas.findMany>[0] = {
      where,
      orderBy,
      take: limit,
      include: {
        cuentascompartidas: {
          select: { id: true, correo: true, plataforma_id: true, contrasena: true, proveedor: true },
        },
        usuarios: { select: { nombre: true, contacto: true } },
      },
    };

    if (cursor) {
      (args as any).cursor = { id: cursor };
      (args as any).skip = 1;
    }

    const rows = await prisma.pantallas.findMany(args);

    const items = rows.map((r: any) => ({
      id: Number(r.id),
      cuenta_id: r.cuenta_id == null ? null : Number(r.cuenta_id),
      contacto: r.contacto,
      nro_pantalla: String(r.nro_pantalla ?? ''),
      // Fechas como YMD (UTC) para que coincidan 1:1 con BD
      fecha_compra: toYMDUTC(r.fecha_compra ?? null),
      fecha_vencimiento: toYMDUTC(r.fecha_vencimiento ?? null),
      meses_pagados: r.meses_pagados == null ? null : Number(r.meses_pagados),

      total_pagado: r.total_pagado == null ? null : Number(r.total_pagado),
      total_pagado_proveedor: r.total_pagado_proveedor == null ? null : Number(r.total_pagado_proveedor),
      total_ganado: r.total_ganado == null ? null : Number(r.total_ganado),

      estado: r.estado ?? null,
      comentario: r.comentario ?? null,

      correo: r.cuentascompartidas?.correo ?? null,
      plataforma_id:
        r.cuentascompartidas?.plataforma_id == null ? null : Number(r.cuentascompartidas.plataforma_id),
      contrasena: r.cuentascompartidas?.contrasena ?? null,
      proveedor: r.cuentascompartidas?.proveedor ?? null,
      nombre: r.usuarios?.nombre ?? null,
    }));

    const nextCursor = items.length === limit ? Number(items[items.length - 1]?.id ?? null) : null;

    return NextResponse.json({ items, nextCursor }, { status: 200 });
  } catch (e: any) {
    console.error('GET /api/pantallas error', e);
    return NextResponse.json(
      { error: 'server_error', detail: e?.message ?? 'Error interno' },
      { status: 500 }
    );
  }
}

/* ========================================================================
 * POST /api/pantallas
 *  - Parser de fechas tolerante (YYYY-MM-DD, ISO, DD/MM/YYYY, YYYY/MM/DD, timestamp)
 *  - Guarda fechas como medianoche UTC para evitar corrimientos
 *  - Upsert usuario (actualiza nombre) + reusa/crea cuenta y actualiza contraseña/proveedor si cambian
 *  - ✅ Fix TS: sin importar `Prisma`; usamos tipos inferidos de `prisma`
 * ======================================================================== */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    let {
      // usuarios
      contacto,
      nombre,

      // cuentascompartidas (opcionales si ya llega cuenta_id)
      cuenta_id,
      plataforma_id,
      correo,
      contrasena,
      proveedor,

      // pantallas
      nro_pantalla,
      fecha_compra,
      fecha_vencimiento,
      meses_pagados,
      total_pagado,
      estado,
      comentario,

      // alias totales admitidos
      total_pagado_proveedor,
      pago_total_proveedor,
      pagado_proveedor,
      total_pagado_proovedor,
      total_ganado,
      ganado,
    } = body ?? {};

    if (!contacto || !fecha_compra || !fecha_vencimiento || !estado) {
      return NextResponse.json(
        { error: 'missing_fields', detail: 'Faltan campos obligatorios.' },
        { status: 400 }
      );
    }

    const contactoNorm = normalizeContacto(contacto);
    const correoNorm = normalizeEmail(correo);

    const mesesPagadosVal: number =
      meses_pagados == null
        ? 1
        : Number.isFinite(Number(meses_pagados))
        ? Number(meses_pagados)
        : 1;

    const totalPagadoVal = toDecStr(total_pagado);
    const totalProvRaw =
      total_pagado_proveedor ?? pago_total_proveedor ?? pagado_proveedor ?? total_pagado_proovedor;
    const totalPagadoProvVal = toDecStr(totalProvRaw);

    const totalGanadoRaw =
      total_ganado ??
      ganado ??
      (totalPagadoVal == null
        ? null
        : totalPagadoProvVal == null
        ? Number(totalPagadoVal)
        : Number(totalPagadoVal) - Number(totalPagadoProvVal));
    const totalGanadoVal = toDecStr(totalGanadoRaw);

    // Fechas (tolerantes) → Date en medianoche UTC
    const fechaCompraDate = parseDateLooseToUTC(fecha_compra);
    const fechaVenceDate = parseDateLooseToUTC(fecha_vencimiento);
    if (!fechaCompraDate || !fechaVenceDate) {
      return NextResponse.json(
        {
          error: 'bad_date',
          detail:
            'Formato de fecha inválido. Acepto YYYY-MM-DD, ISO, DD/MM/YYYY, YYYY/MM/DD o timestamp.',
        },
        { status: 400 }
      );
    }

    // Si tu columna pantallas.cuenta_id es NOT NULL, cámbialo a true
    const CUENTA_ID_ES_OBLIGATORIO = false;
    if (CUENTA_ID_ES_OBLIGATORIO && !cuenta_id && !(correoNorm && plataforma_id)) {
      return NextResponse.json(
        { error: 'missing_cuenta', detail: 'Se requiere cuenta_id o (correo + plataforma_id).' },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      /* 1) Usuario (upsert por contacto) - si envías nombre, lo actualiza */
      const nombreNorm =
      Object.prototype.hasOwnProperty.call(body ?? {}, 'nombre')
        ? ((nombre ?? '').toString().trim() || null)
        : undefined;

      await tx.usuarios.upsert({
        where: { contacto: contactoNorm },
        update: nombreNorm !== undefined ? { nombre: nombreNorm } : {},
        create: { contacto: contactoNorm, nombre: nombreNorm ?? null },
      });

      /* 2) Resolver/Asegurar cuenta compartida y actualizar si cambian datos */
      let cuentaIdFinal: number | undefined = Number.isFinite(Number(cuenta_id))
        ? Number(cuenta_id)
        : undefined;

      const proveedorNorm =
        (proveedor ?? undefined) === undefined ? undefined : (String(proveedor).trim() || null);
      const contrasenaNorm =
        (contrasena ?? undefined) === undefined ? undefined : String(contrasena);

      if (!cuentaIdFinal && correoNorm && plataforma_id) {
        const existing = await tx.cuentascompartidas.findFirst({
          where: { plataforma_id: Number(plataforma_id), correo: correoNorm },
          select: { id: true, contrasena: true, proveedor: true },
        });

        if (existing?.id) {
          cuentaIdFinal = existing.id;

          // Si el usuario editó la contraseña o proveedor, actualizamos
          const updateCC: Record<string, any> = {};
          if (contrasenaNorm !== undefined && contrasenaNorm !== existing.contrasena) {
            updateCC.contrasena = contrasenaNorm;
          }
          if (proveedorNorm !== undefined && proveedorNorm !== existing.proveedor) {
            updateCC.proveedor = proveedorNorm;
          }
          if (Object.keys(updateCC).length > 0) {
            await tx.cuentascompartidas.update({
              where: { id: existing.id },
              data: updateCC,
            });
          }
        } else {
          const cc = await tx.cuentascompartidas.create({
            data: {
              plataforma_id: Number(plataforma_id),
              correo: correoNorm,
              contrasena: String(contrasena ?? ''), // si no mandas, se guarda ''
              proveedor: (proveedor ?? null) == null ? null : (String(proveedor).trim() || null),
            },
            select: { id: true },
          });
          cuentaIdFinal = cc.id;
        }
      } else if (cuentaIdFinal && (contrasenaNorm !== undefined || proveedorNorm !== undefined)) {
        // Llega cuenta_id explícito: permite actualizar contraseña/proveedor si fueron editados
        const updateCC: Record<string, any> = {};
        if (contrasenaNorm !== undefined) updateCC.contrasena = contrasenaNorm;
        if (proveedorNorm !== undefined) updateCC.proveedor = proveedorNorm;
        if (Object.keys(updateCC).length > 0) {
          await tx.cuentascompartidas.update({
            where: { id: cuentaIdFinal },
            data: updateCC,
          });
        }
      }

      /* 3) Crear pantalla
            Importante:
            - Si hay cuenta_id => incluimos la FK (no puede ser null).
            - Si NO hay cuenta_id y tu schema lo permite, NO ponemos el campo.
      */
      type CreateArgs = Parameters<typeof tx.pantallas.create>[0];
      type CreateData = CreateArgs['data'];

      const baseData = {
        contacto: contactoNorm,
        nro_pantalla: String(nro_pantalla ?? '').trim(),
        fecha_compra: fechaCompraDate,
        fecha_vencimiento: fechaVenceDate,
        meses_pagados: mesesPagadosVal,
        total_pagado: totalPagadoVal as any,               // DECIMAL
        total_pagado_proveedor: totalPagadoProvVal as any, // DECIMAL
        total_ganado: totalGanadoVal as any,               // DECIMAL
        estado: String(estado).trim(),
        comentario: (comentario ?? null) == null ? null : String(comentario),
      } satisfies Omit<CreateData, 'cuenta_id'>;

      let data: CreateData;
      if (typeof cuentaIdFinal === 'number' && Number.isFinite(cuentaIdFinal)) {
        data = { ...baseData, cuenta_id: cuentaIdFinal } as CreateData;
      } else {
        // si tu schema requiere cuenta_id NOT NULL, no entrar aquí
        data = baseData as CreateData;
      }

      const res = await tx.pantallas.create({
        data,
        select: {
          id: true,
          cuenta_id: true,
          contacto: true,
          nro_pantalla: true,
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

      return res;
    });

    // Normalizamos salida para el front
    const out = {
      ...created,
      id: Number(created.id),
      cuenta_id: created.cuenta_id == null ? null : Number(created.cuenta_id),
      fecha_compra: toYMDUTC(created.fecha_compra),
      fecha_vencimiento: toYMDUTC(created.fecha_vencimiento),
      meses_pagados: created.meses_pagados == null ? null : Number(created.meses_pagados),
      total_pagado: created.total_pagado == null ? null : Number(created.total_pagado),
      total_pagado_proveedor:
        created.total_pagado_proveedor == null ? null : Number(created.total_pagado_proveedor),
      total_ganado: created.total_ganado == null ? null : Number(created.total_ganado),
    };

    return NextResponse.json(out, { status: 201 });
  } catch (e: any) {
    if (e?.message === 'missing_cuenta_id_en_schema') {
      return NextResponse.json(
        { error: 'missing_cuenta', detail: 'El schema requiere cuenta_id y no se pudo resolver.' },
        { status: 400 }
      );
    }
    console.error('POST /api/pantallas', e);
    return NextResponse.json(
      { error: 'server_error', detail: e?.message ?? 'Error interno' },
      { status: 500 }
    );
  }
}
