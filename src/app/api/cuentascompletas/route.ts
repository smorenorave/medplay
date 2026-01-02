// src/app/api/cuentascompletas/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* ===================== Utils de fechas (sin desfases por huso) ===================== */
const pad2 = (n: number) => String(n).padStart(2, "0");

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
  const y = Number(m[1]),
    mo = Number(m[2]),
    d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d));
}

/* ===================== Otras utils ===================== */

// normaliza contacto (mismo criterio que en otros routers)
function normalizeContactoServer(raw?: string | null) {
  return (raw ?? "").trim().replace(/\s+/g, "");
}

// clamp seguro
const clamp = (n: number | null | undefined, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
};


async function withTxRetry<T>(fn: () => Promise<T>, retries = 6) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      const code = e?.code;
      const retriable =
        code === "P2034" || // write conflict / deadlock (Cockroach)
        code === "P2002";   // unique race (puede pasar con upsert bajo concurrencia)

      if (retriable && attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, 50 * attempt));
        continue;
      }
      throw e;
    }
  }
}


/* ===================== GET: lista con filtros + cursor ===================== */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = clamp(Number(searchParams.get("limit")), 1, 5000, 200);
    const cursor = searchParams.get("cursor"); // id numérico

    const plataformaRaw =
      searchParams.get("plataforma_id") ??
      searchParams.get("plataformaId") ??
      searchParams.get("pid");

    const qRaw = (searchParams.get("q") || "").trim();

    // where básico
    const where: any = {};

    const vencidasFlag = searchParams.get("vencidas") === "1";
    if (vencidasFlag) {
      // el front ya tiene today()/tomorrow() en local (mejor mandarlas)
      const hoyParam = searchParams.get("hoy");
      const mananaParam = searchParams.get("manana");

      const hoy =
        parseYMDToUTCDate(hoyParam) ??
        new Date(
          Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
        );

      const manana =
        parseYMDToUTCDate(mananaParam) ??
        new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + 1));

      // “vencidas + hoy + mañana”
      where.fecha_vencimiento = { lte: manana };
    }

    if (plataformaRaw && !Number.isNaN(Number(plataformaRaw))) {
      where.plataforma_id = Number(plataformaRaw);
    }

    if (qRaw) {
      const qLower = qRaw.toLowerCase();
      const qNoSpaces = qRaw.replace(/\s+/g, "");
      where.OR = [
        { correo: { contains: qLower } }, // correos guardados en lower
        { contacto: { contains: qRaw } }, // tal cual
      ];
      if (qNoSpaces !== qRaw) where.OR.push({ contacto: { contains: qNoSpaces } });
    }

    // orden estable para cursor descendente por id
    const orderBy = { id: "desc" as const };

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
      // Fechas serializadas en YMD (igual que en BD)
      fecha_compra: toYMDUTC(r.fecha_compra),
      fecha_vencimiento: toYMDUTC(r.fecha_vencimiento),
      meses_pagados: r.meses_pagados == null ? null : Number(r.meses_pagados),
      total_pagado: r.total_pagado == null ? null : Number(r.total_pagado),
      total_pagado_proveedor:
        r.total_pagado_proveedor == null ? null : Number(r.total_pagado_proveedor),
      total_ganado: r.total_ganado == null ? null : Number(r.total_ganado),
      estado: r.estado ?? null,
      comentario: r.comentario ?? null,
    }));

    // siguiente cursor: último id de esta página (orden desc => el menor id de la página)
    const nextCursor = items.length === limit ? items[items.length - 1]?.id ?? null : null;

    return NextResponse.json({ items, nextCursor }, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/cuentascompletas", e);
    return NextResponse.json(
      { error: "server_error", detail: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}

/* ===================== POST: crear + asegurar usuario + limpiar inventario ===================== */
export async function POST(req: Request) {
  try {
    const json = await req.json();

    // Admitimos payload plano o {cuenta, usuario}
    const flat =
      json && typeof json === "object" && "cuenta" in json
        ? {
            ...json.cuenta,
            contacto: (json as any).cuenta?.contacto ?? (json as any).usuario?.contacto,
            nombre: (json as any).usuario?.nombre ?? null,
          }
        : json;

    // Validaciones ligeras
    const contactoRaw = String((flat as any)?.contacto ?? "").trim();
    const contacto = normalizeContactoServer(contactoRaw);

    const nombreRaw = (flat as any)?.nombre ?? null;
    const nombre = nombreRaw == null ? null : String(nombreRaw).trim() || null;

    const plataforma_id = Number((flat as any)?.plataforma_id);
    const correo = String((flat as any)?.correo ?? "").trim().toLowerCase(); // normaliza a minúsculas
    const contrasena = String((flat as any)?.contrasena ?? "").trim();
    const proveedor =
      ((flat as any)?.proveedor ?? null) == null ? null : String((flat as any).proveedor).trim() || null;

    // Parsear fechas (UTC midnight) para evitar desfases
    const fecha_compra = parseYMDToUTCDate((flat as any)?.fecha_compra ?? null);
    const fecha_vencimiento = parseYMDToUTCDate((flat as any)?.fecha_vencimiento ?? null);

    const meses_pagados =
      (flat as any)?.meses_pagados == null || Number.isNaN(Number((flat as any).meses_pagados))
        ? null
        : Number((flat as any).meses_pagados);

    const total_pagado =
      (flat as any)?.total_pagado == null || Number.isNaN(Number((flat as any).total_pagado))
        ? null
        : Number((flat as any).total_pagado);

    const total_pagado_proveedor =
      (flat as any)?.total_pagado_proveedor == null ||
      Number.isNaN(Number((flat as any).total_pagado_proveedor))
        ? null
        : Number((flat as any).total_pagado_proveedor);

    const estado =
      ((flat as any)?.estado ?? null) == null ? null : String((flat as any).estado).trim() || null;

    const comentario =
      ((flat as any)?.comentario ?? null) == null
        ? null
        : String((flat as any).comentario).trim() || null;

    // Requisitos mínimos
    if (!contacto || !plataforma_id || !correo || !contrasena) {
      return NextResponse.json(
        {
          error: "validation",
          detail: "Faltan campos obligatorios (contacto, plataforma_id, correo, contrasena).",
        },
        { status: 400 }
      );
    }

    // Validar fechas
    if (!fecha_compra || !fecha_vencimiento) {
      return NextResponse.json(
        { error: "bad_date", detail: "Formato de fecha inválido. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // total_ganado según regla
    const total_ganado =
      total_pagado == null
        ? null
        : total_pagado_proveedor == null
          ? total_pagado
          : total_pagado - total_pagado_proveedor;

    // Transacción: asegurar usuario + crear cuenta + limpiar inventario
    const created = await withTxRetry(() =>
    prisma.$transaction(async (tx) => {
      // 1) asegurar usuario (concurrencia segura)
      await tx.usuarios.upsert({
      where: { contacto },
      create: { contacto, nombre },
      update: nombre ? { nombre } : {}, // solo actualiza si viene nombre
    });


      // 2) crear cuenta completa
      const saved = await tx.cuentascompletas.create({
        data: {
          contacto,
          plataforma_id,
          correo,
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

      // 3) eliminar del inventario (si existe) por plataforma y correo
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
        await tx.$executeRaw`
          DELETE FROM inventario
          WHERE plataforma_id = ${plataforma_id}
            AND LOWER(correo) = ${correo}
        `;
      }

      return saved;
    }));

    // Normalizamos para front (fechas en YMD)
    const out = {
      ...created,
      id: Number(created.id),
      plataforma_id: Number(created.plataforma_id),
      fecha_compra: toYMDUTC(created.fecha_compra as any),
      fecha_vencimiento: toYMDUTC(created.fecha_vencimiento as any),
      meses_pagados: created.meses_pagados == null ? null : Number(created.meses_pagados),
      total_pagado: created.total_pagado == null ? null : Number(created.total_pagado),
      total_pagado_proveedor:
        created.total_pagado_proveedor == null ? null : Number(created.total_pagado_proveedor),
      total_ganado: created.total_ganado == null ? null : Number(created.total_ganado),
    };

    return NextResponse.json(out, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/cuentascompletas error:", e);
    return NextResponse.json(
      { error: "server_error", detail: e?.message ?? "Error" },
      { status: 500 }
    );
  }
}
