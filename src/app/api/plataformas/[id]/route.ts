export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Lee y valida el id desde ctx.params (que puede ser Promise en Next 15) */
async function getId(
  params: { id?: string } | Promise<{ id?: string }>
): Promise<number | null> {
  const p = await params;
  const n = Number(p?.id ?? "");
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/* =========================================================
 * GET /api/plataformas/:id
 * ======================================================= */
export async function GET(
  _req: Request,
  ctx: { params: { id?: string } | Promise<{ id?: string }> }
) {
  const id = await getId(ctx.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const row = await prisma.plataformas.findUnique({
      where: { id },
      // ✅ SE AGREGARON LOS CAMPOS DE TOTALES AQUÍ
      select: { 
        id: true, 
        nombre: true, 
        cantidad_pantallas: true,
        total_pagado: true,
        total_pagado_proveedor: true
      },
    });

    if (!row) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    return NextResponse.json(row, { status: 200 });
  } catch (err) {
    console.error("GET /api/plataformas/[id] error:", err);
    return NextResponse.json({ error: "No se pudo obtener" }, { status: 500 });
  }
}

/* =========================================================
 * PATCH /api/plataformas/:id
 * ======================================================= */
export async function PATCH(
  _req: Request,
  ctx: { params: { id?: string } | Promise<{ id?: string }> }
) {
  const id = await getId(ctx.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const body = await _req.json().catch(() => ({} as any));
    const data: Record<string, unknown> = {};

    if (typeof body?.nombre === "string") {
      const nombre = body.nombre.trim();
      if (!nombre) {
        return NextResponse.json(
          { error: "El nombre no puede estar vacío." },
          { status: 400 }
        );
      }
      if (nombre.length > 100) {
        return NextResponse.json(
          { error: "Máximo 100 caracteres." },
          { status: 400 }
        );
      }
      data.nombre = nombre;
    }

    if (body?.cantidad_pantallas !== undefined && body?.cantidad_pantallas !== null) {
      const n = Number(body.cantidad_pantallas);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json(
          { error: '"cantidad_pantallas" debe ser un entero >= 0.' },
          { status: 400 }
        );
      }
      data.cantidad_pantallas = n;
    }

    // ✅ SE AGREGÓ VALIDACIÓN Y ASIGNACIÓN PARA total_pagado
    if (body?.total_pagado !== undefined && body?.total_pagado !== null) {
      const tp = Number(body.total_pagado);
      if (Number.isNaN(tp) || tp < 0) {
        return NextResponse.json(
          { error: '"total_pagado" debe ser un número >= 0.' },
          { status: 400 }
        );
      }
      data.total_pagado = tp;
    }

    // ✅ SE AGREGÓ VALIDACIÓN Y ASIGNACIÓN PARA total_pagado_proveedor
    if (body?.total_pagado_proveedor !== undefined && body?.total_pagado_proveedor !== null) {
      const tpp = Number(body.total_pagado_proveedor);
      if (Number.isNaN(tpp) || tpp < 0) {
        return NextResponse.json(
          { error: '"total_pagado_proveedor" debe ser un número >= 0.' },
          { status: 400 }
        );
      }
      data.total_pagado_proveedor = tpp;
    }

    const updated = await prisma.plataformas.update({
      where: { id },
      data,
      // ✅ SE AGREGARON LOS CAMPOS DE TOTALES AL SELECT
      select: { 
        id: true, 
        nombre: true, 
        cantidad_pantallas: true,
        total_pagado: true,
        total_pagado_proveedor: true
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una plataforma con ese nombre." },
        { status: 409 }
      );
    }
    console.error("PATCH /api/plataformas/[id] error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar" },
      { status: 500 }
    );
  }
}

/* =========================================================
 * DELETE /api/plataformas/:id
 * ======================================================= */
export async function DELETE(
  _req: Request,
  ctx: { params: { id?: string } | Promise<{ id?: string }> }
) {
  const id = await getId(ctx.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    await prisma.plataformas.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    if (err?.code === "P2003") {
      return NextResponse.json(
        { message: "No se puede eliminar: la plataforma tiene registros asociados." },
        { status: 409 }
      );
    }
    console.error("DELETE /api/plataformas/[id] error:", err);
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  }
}

/* =========================================================
 * OPTIONS /api/plataformas/:id
 * ======================================================= */
export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}