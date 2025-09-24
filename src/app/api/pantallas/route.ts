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

  // 2) ISO (YYYY-MM-DDTHH:mm:ssZ, etc.)
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

  // 6) Fallback: dejar que Date lo parsee y normalizar a medianoche UTC
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  return null;
}

const normalizeContacto = (s: string) => (s ?? '').replace(/\s+/g, '');

// Serializar BigInt -> string para JSON seguro
function safeJson<T>(data: T) {
  return JSON.parse(JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

/* ========================================================================
 * GET /api/pantallas
 *  - Filtros: ?plataforma_id | plataformaId | pid, ?cuenta_id
 *  - Cursor:  ?cursor=<id>&limit=300 (máx 5000)
 *  - Orden:   fecha_vencimiento asc, id asc
 * ======================================================================== */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limitRaw = searchParams.get('limit');
    const cursorRaw = searchParams.get('cursor');
    const cuentaIdRaw = searchParams.get('cuenta_id');
    const plataformaRaw =
      searchParams.get('plataforma_id') ??
      searchParams.get('plataformaId') ??
      searchParams.get('pid');

    const limit = limitRaw ? Math.max(1, Math.min(5000, Number(limitRaw))) : 300;
    const cursor = cursorRaw ? Number(cursorRaw) : null;
    const plataformaId = plataformaRaw ? Number(plataformaRaw) : null;
    const cuentaId = cuentaIdRaw ? Number(cuentaIdRaw) : null;

    if (Number.isNaN(limit) || (cursorRaw && Number.isNaN(cursor!))) {
      return NextResponse.json(
        { error: 'bad_request', detail: 'Parámetros inválidos: limit/cursor.' },
        { status: 400 }
      );
    }

    const where: Record<string, any> = {};
    if (plataformaId != null && !Number.isNaN(plataformaId)) {
      where.cuentascompartidas = { plataforma_id: plataformaId };
    }
    if (cuentaId != null && !Number.isNaN(cuentaId)) {
      where.cuenta_id = cuentaId;
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
      plataforma_id: r.cuentascompartidas?.plataforma_id == null ? null : Number(r.cuentascompartidas.plataforma_id),
      contrasena: r.cuentascompartidas?.contrasena ?? null,
      proveedor: r.cuentascompartidas?.proveedor ?? null,
      nombre: r.usuarios?.nombre ?? null,
    }));

    const nextCursor = items.length === limit ? Number(items[items.length - 1]?.id ?? null) : null;

    return NextResponse.json({ items, nextCursor });
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
    const correoNorm = (correo ?? '').toString().trim().toLowerCase();

    const mesesPagadosVal: number | null =
      meses_pagados == null
        ? 1
        : Number.isFinite(Number(meses_pagados))
        ? Number(meses_pagados)
        : 1;

    const toDecStr = (v: any): string | null =>
      v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v).toFixed(2);

    const totalPagadoVal: string | null =
      total_pagado == null || total_pagado === '' ? null : Number(total_pagado).toFixed(2);

    const totalProvRaw =
      total_pagado_proveedor ?? pago_total_proveedor ?? pagado_proveedor ?? total_pagado_proovedor;

    const totalPagadoProvVal: string | null = toDecStr(totalProvRaw);

    const totalGanadoRaw =
      total_ganado ??
      ganado ??
      (totalPagadoVal == null
        ? null
        : totalPagadoProvVal == null
        ? Number(totalPagadoVal)
        : Number(totalPagadoVal) - Number(totalPagadoProvVal));

    const totalGanadoVal: string | null = toDecStr(totalGanadoRaw);

    // Fechas (tolerantes) → Date en medianoche UTC
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

    // Si tu columna pantallas.cuenta_id es NOT NULL, pon esto en true
    const CUENTA_ID_ES_OBLIGATORIO = false;
    if (CUENTA_ID_ES_OBLIGATORIO && !cuenta_id && !(correoNorm && plataforma_id)) {
      return NextResponse.json(
        { error: 'missing_cuenta', detail: 'Se requiere cuenta_id o (correo + plataforma_id).' },
        { status: 400 }
      );
    }

    const pantalla = await prisma.$transaction(async (tx) => {
      // 1) Usuario (upsert por contacto)
      const user = await tx.usuarios.upsert({
        where: { contacto: contactoNorm },
        update: nombre ? { nombre } : {},
        create: { contacto: contactoNorm, nombre: nombre ?? null },
      });

      // 2) Resolver/Asegurar cuenta compartida si hace falta
      let cuentaIdFinal: number = cuenta_id;
      if (!cuentaIdFinal && correoNorm && plataforma_id) {
        const existing = await tx.cuentascompartidas.findFirst({
          where: { plataforma_id: Number(plataforma_id), correo: correoNorm },
          select: { id: true },
        });

        if (existing?.id) {
          cuentaIdFinal = existing.id;
        } else {
          const created = await tx.cuentascompartidas.create({
            data: {
              plataforma_id: Number(plataforma_id),
              correo: correoNorm,
              contrasena: String(contrasena ?? ''),
              proveedor: proveedor ? String(proveedor) : null,
            },
            select: { id: true },
          });
          cuentaIdFinal = created.id;
        }
      }

      // 3) Crear pantalla
      return tx.pantallas.create({
        data: {
          cuenta_id: cuentaIdFinal ?? null,
          contacto: user.contacto,
          nro_pantalla: String(nro_pantalla ?? '').trim(),
          fecha_compra: fechaCompraDate,
          fecha_vencimiento: fechaVenceDate,
          meses_pagados: mesesPagadosVal,
          total_pagado: totalPagadoVal,               // DECIMAL (string) o null
          total_pagado_proveedor: totalPagadoProvVal, // DECIMAL (string) o null
          total_ganado: totalGanadoVal,               // DECIMAL (string) o null
          estado: String(estado).trim(),
          comentario: comentario ? String(comentario) : null,
        },
      });
    });

    return NextResponse.json(safeJson(pantalla), { status: 201 });
  } catch (e: any) {
    console.error('POST /api/pantallas', e);
    return NextResponse.json(
      { error: 'server_error', detail: e?.message ?? 'Error interno' },
      { status: 500 }
    );
  }
}
