import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";
import { expiredDeletionFailure } from "@/lib/expiredDeletionFailure";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!await getAuthenticatedAdminId(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const items = await prisma.$transaction(async tx => {
      const accounts = await tx.cuentascompletas.findMany({ where: { passwordManagedAt: { not: null } }, include: { usuarios: true, plataformas: { select: { id: true, nombre: true } } }, orderBy: { id: "asc" } });
      const screens = await tx.pantallas.findMany({ where: { passwordManagedAt: { not: null } }, include: { usuarios: true, cuentascompartidas: { include: { plataformas: { select: { id: true, nombre: true } } } } }, orderBy: { id: "asc" } });
      return [
        ...accounts.map(row => ({ ...row, id: String(row.id), tipo: "cuenta", nombre: row.usuarios.nombre, plataforma: row.plataformas.nombre, total_pagado: row.total_pagado_completa, total_pagado_proveedor: row.total_pagado_proveedor_completa })),
        ...screens.map(row => ({ ...row, id: String(row.id), tipo: "pantalla", nombre: row.usuarios.nombre, plataforma: row.cuentascompartidas.plataformas?.nombre, plataforma_id: row.cuentascompartidas.plataforma_id, correo: row.cuentascompartidas.correo, contrasena: row.cuentascompartidas.contrasena, proveedor: row.cuentascompartidas.proveedor })),
      ];
    }, { isolationLevel: "RepeatableRead" });
    return NextResponse.json({ items: JSON.parse(JSON.stringify(items, (_key, value) => typeof value === "bigint" ? String(value) : value)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = expiredDeletionFailure(error);
    return NextResponse.json({ error: failure.error, code: failure.code }, { status: failure.status });
  }
}
