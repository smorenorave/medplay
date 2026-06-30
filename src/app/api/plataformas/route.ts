export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/plataformas
 * ?q=texto   (opcional, filtra por nombre)
 * Devuelve: Array<{ id, nombre, cantidad_pantallas }>
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();

    const where = q
      ? { nombre: { contains: q, mode: "insensitive" as const } }
      : undefined;

    const items = await prisma.plataformas.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        cantidad_pantallas: true,
        total_pago: true,
        total_pagado_proveedor: true,
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(items, { status: 200 });
  } catch (err) {
    console.error("GET /api/plataformas error:", err);
    return NextResponse.json(
      { error: "No se pudieron listar las plataformas" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/plataformas
 * Body: { nombre: string, cantidad_pantallas?: number }
 * Devuelve: { id, nombre, cantidad_pantallas }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}) as any);

    const rawNombre = (body?.nombre ?? "").toString();
    const nombre = rawNombre.trim();

    if (!nombre) {
      return NextResponse.json(
        { error: 'El campo "nombre" es obligatorio.' },
        { status: 400 },
      );
    }
    if (nombre.length > 100) {
      return NextResponse.json(
        { error: "El nombre no puede exceder 100 caracteres." },
        { status: 400 },
      );
    }

    let cantidad_pantallas: number | undefined = undefined;
    if (
      body?.cantidad_pantallas !== undefined &&
      body?.cantidad_pantallas !== null
    ) {
      const n = Number(body.cantidad_pantallas);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json(
          { error: '"cantidad_pantallas" debe ser un entero >= 0.' },
          { status: 400 },
        );
      }
      cantidad_pantallas = n;
    }

    let total_pago: number | undefined = undefined;

    if (body?.total_pago !== undefined && body?.total_pago !== null) {
      const n = Number(body.total_pago);

      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json(
          { error: '"total_pago" debe ser mayor o igual a 0.' },
          { status: 400 },
        );
      }

      total_pago = n;
    }

    let total_pagado_proveedor: number | undefined = undefined;

    if (
      body?.total_pagado_proveedor !== undefined &&
      body?.total_pagado_proveedor !== null
    ) {
      const n = Number(body.total_pagado_proveedor);

      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json(
          { error: '"total_pagado_proveedor" debe ser mayor o igual a 0.' },
          { status: 400 },
        );
      }

      total_pagado_proveedor = n;
    }

    const created = await prisma.plataformas.create({
      data: {
        nombre,

        ...(cantidad_pantallas !== undefined ? { cantidad_pantallas } : {}),

        ...(total_pago !== undefined ? { total_pago } : {}),

        ...(total_pagado_proveedor !== undefined
          ? { total_pagado_proveedor }
          : {}),
      },
      select: {
        id: true,
        nombre: true,
        cantidad_pantallas: true,
        total_pago: true,
        total_pagado_proveedor: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una plataforma con ese nombre." },
        { status: 409 },
      );
    }
    console.error("POST /api/plataformas error:", err);
    return NextResponse.json(
      { error: "No se pudo crear la plataforma" },
      { status: 500 },
    );
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
