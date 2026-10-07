import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getVerifiedAdminId } from "@/lib/requireAdmin";
import { serializable } from "@/lib/emailDeletion";

export const dynamic = "force-dynamic";
const response = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
const schema = z.object({ plataformas: z.array(z.object({ id: z.number().int().positive().max(2147483647), habilitada: z.boolean() }).strict()).max(10000) }).strict();
function failure(error: unknown) {
  console.error("Audit settings failed", error);
  const code = (error as { code?: string }).code;
  return response({ error: code === "P2022" || code === "P2021"
    ? "La base de datos necesita las migraciones de auditoría. Ejecuta prisma migrate deploy y vuelve a actualizar las plataformas."
    : "No se pudo consultar o guardar la configuración de auditoría. Intenta actualizar las plataformas." }, 500);
}
export async function GET(request: Request) {
  try {
    if (!await getVerifiedAdminId(request)) return response({ error: "Permisos de administrador requeridos" }, 403);
    const plataformas = await prisma.plataformas.findMany({ select: { id: true, nombre: true, auditarEliminaciones: true }, orderBy: { nombre: "asc" } });
    return response({ plataformas });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    if (!await getVerifiedAdminId(request)) return response({ error: "Permisos de administrador requeridos" }, 403);
    const body = schema.safeParse(await request.json().catch(() => null));
    if (!body.success || new Set(body.data.plataformas.map(row => row.id)).size !== body.data.plataformas.length) return response({ error: "Selecciona plataformas válidas sin duplicados." }, 400);
    const plataformas = await serializable(prisma, async tx => {
      const ids = body.data.plataformas.map(row => row.id);
      if (await tx.plataformas.count({ where: { id: { in: ids } } }) !== ids.length) throw new Error("platform-changed");
      for (const habilitada of [true, false]) await tx.plataformas.updateMany({ where: { id: { in: body.data.plataformas.filter(row => row.habilitada === habilitada).map(row => row.id) } }, data: { auditarEliminaciones: habilitada } });
      return tx.plataformas.findMany({ select: { id: true, nombre: true, auditarEliminaciones: true }, orderBy: { nombre: "asc" } });
    });
    return response({ plataformas });
  } catch (error) {
    if ((error as Error).message === "platform-changed") return response({ error: "El catálogo cambió. Actualiza la lista antes de guardar." }, 409);
    return failure(error);
  }
}
