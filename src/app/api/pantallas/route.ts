// src/app/api/pantallas/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/* ===================== Utils de fechas (sin desfases) ===================== */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTxRetry<T>(fn: () => Promise<T>, maxRetries = 5) {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      const code = e?.code;
      const retryable = code === "P2034"; // write conflict/deadlock (Cockroach)
      if (!retryable || attempt >= maxRetries) throw e;

      attempt++;
      // backoff simple + jitter
      const delay = 50 * Math.pow(2, attempt) + Math.floor(Math.random() * 50);
      await sleep(delay);
    }
  }
}


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
    const vencidasFlag = searchParams.get('vencidas') === '1';
    if (vencidasFlag) {
      const hoyParam = searchParams.get('hoy');
      const mananaParam = searchParams.get('manana');

      const hoy =
        parseDateLooseToUTC(hoyParam) ??
        new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

      const manana =
        parseDateLooseToUTC(mananaParam) ??
        new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 1));

      where.fecha_vencimiento = { lte: manana };
    }

    if (cuentaIdRaw && !Number.isNaN(Number(cuentaIdRaw))) {
      where.cuenta_id = Number(cuentaIdRaw);
    }

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
          select: {
            id: true,
            correo: true,
            plataforma_id: true,
            contrasena: true,
            proveedor: true,
            cuenta_caida: true,
          },
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
      fecha_compra: toYMDUTC(r.fecha_compra ?? null),
      fecha_vencimiento: toYMDUTC(r.fecha_vencimiento ?? null),
      meses_pagados: r.meses_pagados == null ? null : Number(r.meses_pagados),
      total_pagado: r.total_pagado == null ? null : Number(r.total_pagado),
      total_pagado_proveedor: r.total_pagado_proveedor == null ? null : Number(r.total_pagado_proveedor),
      total_ganado: r.total_ganado == null ? null : Number(r.total_ganado),
      estado: r.estado ?? null,
      comentario: r.comentario ?? null,

      correo: r.cuentascompartidas?.correo ?? null,
      plataforma_id: r.cuentascompartidas?.plataforma_id == null ? null : Number(r.cuentascompartidas.plataforma_id),
      contrasena: r.cuentascompartidas?.contrasena ?? null,
      proveedor: r.cuentascompartidas?.proveedor ?? null,
      nombre: r.usuarios?.nombre ?? null,

      cuenta_caida: !!r.cuentascompartidas?.cuenta_caida,
    }));

    const nextCursor = items.length === limit ? Number(items[items.length - 1]?.id ?? null) : null;

    return NextResponse.json({ items, nextCursor }, { status: 200 });
  } catch (e: any) {
    console.error('GET /api/pantallas error', e);
    return NextResponse.json({ error: 'server_error', detail: e?.message ?? 'Error interno' }, { status: 500 });
  }
}

/* ========================================================================
 * POST /api/pantallas
 *  - `cuenta_id` es OBLIGATORIO (tu schema lo exige). Si no se puede resolver, 400.
 *  - Usuario: create + P2002 + updateMany (concurrencia segura)
 * ======================================================================== */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    let {
      contacto,
      nombre,
      cuenta_id,
      plataforma_id,
      correo,
      contrasena,
      proveedor,
      nro_pantalla,
      fecha_compra,
      fecha_vencimiento,
      meses_pagados,
      total_pagado,
      estado,
      comentario,
      total_pagado_proveedor,
      pago_total_proveedor,
      pagado_proveedor,
      total_pagado_proovedor,
      total_ganado,
      ganado,
    } = body ?? {};

    if (!contacto || !fecha_compra || !fecha_vencimiento || !estado) {
      return NextResponse.json({ error: 'missing_fields', detail: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    const contactoNorm = normalizeContacto(contacto);
    const correoNorm = normalizeEmail(correo);

    const mesesPagadosVal: number =
      meses_pagados == null ? 1 : Number.isFinite(Number(meses_pagados)) ? Number(meses_pagados) : 1;

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

    const fechaCompraDate = parseDateLooseToUTC(fecha_compra);
    const fechaVenceDate = parseDateLooseToUTC(fecha_vencimiento);
    if (!fechaCompraDate || !fechaVenceDate) {
      return NextResponse.json(
        {
          error: 'bad_date',
          detail: 'Formato de fecha inválido. Acepto YYYY-MM-DD, ISO, DD/MM/YYYY, YYYY/MM/DD o timestamp.',
        },
        { status: 400 }
      );
    }

    // ✅ detectar si "nombre" vino en el payload (para no pisar si no vino)
    const nombreProvided = body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'nombre');
    const nombreNorm = nombreProvided ? (String(nombre ?? '').trim() || null) : undefined;

const created = await withTxRetry(() =>
  prisma.$transaction(async (tx) => {
      /* -------------------- 1) Usuario (concurrencia segura, SIN upsert) -------------------- */
      try {
        await tx.usuarios.create({
          data: {
            contacto: contactoNorm,
            nombre: nombreProvided ? (nombreNorm ?? null) : null,
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002') {
          // Solo actualizamos si el nombre vino en el payload
          if (nombreProvided) {
            await tx.usuarios.update({
            where: { contacto: contactoNorm }, // debe ser UNIQUE o PRIMARY
            data: { nombre: nombreNorm ?? null },
          });
          }
        } else {
          throw e;
        }
      }

      /* -------------------- 2) Resolver/Asegurar cuenta compartida -------------------- */
      let cuentaIdFinal: number | undefined = Number.isFinite(Number(cuenta_id)) ? Number(cuenta_id) : undefined;

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
          try {
            const cc = await tx.cuentascompartidas.create({
              data: {
                plataforma_id: Number(plataforma_id),
                correo: correoNorm,
                contrasena: String(contrasena ?? ''),
                proveedor:
                  (proveedor ?? null) == null ? null : (String(proveedor).trim() || null),
              },
              select: { id: true },
            });
            cuentaIdFinal = cc.id;
          } catch (e: any) {
            if (e?.code === "P2002") {
              // otro request la creó justo antes → re-leer
              const again = await tx.cuentascompartidas.findFirst({
                where: { plataforma_id: Number(plataforma_id), correo: correoNorm },
                select: { id: true },
              });
              if (again?.id) cuentaIdFinal = again.id;
              else throw e;
            } else {
              throw e;
            }
          }
        }
      } else if (cuentaIdFinal && (contrasenaNorm !== undefined || proveedorNorm !== undefined)) {
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

      if (!(typeof cuentaIdFinal === 'number' && Number.isFinite(cuentaIdFinal))) {
        throw new Error('missing_cuenta_resuelta');
      }

      /* -------------------- 3) Crear pantalla -------------------- */
      const base = await tx.pantallas.create({
        data: {
          cuenta_id: cuentaIdFinal,
          contacto: contactoNorm,
          nro_pantalla: String(nro_pantalla ?? '').trim(),
          fecha_compra: fechaCompraDate,
          fecha_vencimiento: fechaVenceDate,
          meses_pagados: mesesPagadosVal,
          total_pagado: totalPagadoVal as any,
          total_pagado_proveedor: totalPagadoProvVal as any,
          total_ganado: totalGanadoVal as any,
          estado: String(estado).trim(),
          comentario: (comentario ?? null) == null ? null : String(comentario),
        },
        select: { id: true },
      });

      /* -------------------- 4) Leer con include para devolver aplanado -------------------- */
      const full = await tx.pantallas.findUniqueOrThrow({
        where: { id: base.id },
        include: {
          cuentascompartidas: {
            select: {
              id: true,
              correo: true,
              plataforma_id: true,
              contrasena: true,
              proveedor: true,
              cuenta_caida: true,
            },
          },
          usuarios: { select: { nombre: true, contacto: true } },
        },
      });

      return full;
    }));

    /* -------------------- salida normalizada para el front -------------------- */
    const out = {
      id: Number(created.id),
      cuenta_id: created.cuenta_id == null ? null : Number(created.cuenta_id),
      contacto: created.contacto,
      nro_pantalla: String(created.nro_pantalla ?? ''),
      fecha_compra: toYMDUTC(created.fecha_compra),
      fecha_vencimiento: toYMDUTC(created.fecha_vencimiento),
      meses_pagados: created.meses_pagados == null ? null : Number(created.meses_pagados),
      total_pagado: created.total_pagado == null ? null : Number(created.total_pagado),
      total_pagado_proveedor: created.total_pagado_proveedor == null ? null : Number(created.total_pagado_proveedor),
      total_ganado: created.total_ganado == null ? null : Number(created.total_ganado),
      estado: created.estado ?? null,
      comentario: created.comentario ?? null,

      correo: created.cuentascompartidas?.correo ?? null,
      plataforma_id:
        created.cuentascompartidas?.plataforma_id == null ? null : Number(created.cuentascompartidas.plataforma_id),
      contrasena: created.cuentascompartidas?.contrasena ?? null,
      proveedor: created.cuentascompartidas?.proveedor ?? null,
      nombre: created.usuarios?.nombre ?? null,

      cuenta_caida: !!created.cuentascompartidas?.cuenta_caida,
    };

    return NextResponse.json(out, { status: 201 });
  } catch (e: any) {
    if (e?.message === 'missing_cuenta_resuelta') {
      return NextResponse.json(
        { error: 'missing_cuenta', detail: 'No se pudo resolver cuenta_id para la pantalla.' },
        { status: 400 }
      );
    }
    console.error('POST /api/pantallas', e);
    return NextResponse.json({ error: 'server_error', detail: e?.message ?? 'Error interno' }, { status: 500 });
  }
}
