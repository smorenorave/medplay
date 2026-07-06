export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/plataformas
 * ?q=texto   (opcional, filtra por nombre)
 * Devuelve: Array<{ id, nombre, cantidad_pantallas, total_pagado, total_pagado_proveedor, total_pagado_completa, total_pagado_proveedor_completa }>
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
        total_pagado: true,
        total_pagado_proveedor: true,
        total_pagado_completa: true,
        total_pagado_proveedor_completa: true,
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
 * Body: { nombre: string, cantidad_pantallas?: number, total_pagado?: number, total_pagado_proveedor?: number, total_pagado_completa?: number, total_pagado_proveedor_completa?: number }
 * Devuelve: { id, nombre, cantidad_pantallas, total_pagado, total_pagado_proveedor, total_pagado_completa, total_pagado_proveedor_completa }
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

    // Helper para parsear los 4 campos decimales de la misma forma
    const decimalFields = [
      "total_pagado",
      "total_pagado_proveedor",
      "total_pagado_completa",
      "total_pagado_proveedor_completa",
    ] as const;

    const decimals: Record<string, number> = {};
    for (const field of decimalFields) {
      if (body?.[field] !== undefined && body?.[field] !== null) {
        const n = Number(body[field]);
        if (Number.isNaN(n) || n < 0) {
          return NextResponse.json(
            { error: `"${field}" debe ser mayor o igual a 0.` },
            { status: 400 },
          );
        }
        decimals[field] = n;
      }
    }

    const created = await prisma.plataformas.create({
      data: {
        nombre,
        ...(cantidad_pantallas !== undefined ? { cantidad_pantallas } : {}),
        ...decimals,
      },
      select: {
        id: true,
        nombre: true,
        cantidad_pantallas: true,
        total_pagado: true,
        total_pagado_proveedor: true,
        total_pagado_completa: true,
        total_pagado_proveedor_completa: true,
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
