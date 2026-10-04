import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";
import { deletionAuditFilters } from "@/lib/deletionAuditFilters";

export const dynamic = "force-dynamic";
const response = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const serialize = (value: unknown) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? String(item) : item));
export async function GET(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId || !await prisma.admin.findUnique({ where: { id: adminId }, select: { id: true } })) return response({ error: "No autorizado" }, 401);
  const params = new URL(request.url).searchParams;
  if (params.get("facets") === "platforms") {
    // Historical platforms must remain selectable even after their catalog row is removed.
    const rows = await prisma.emailDeletionAudit.findMany({ select: { plataformas: true }, orderBy: [{ fechaEliminacion: "desc" }, { id: "desc" }] });
    const platforms = new Map<number, { id: number; nombre: string }>();
    for (const row of rows) {
      if (!Array.isArray(row.plataformas)) continue;
      for (const item of row.plataformas) {
        if (item && typeof item === "object" && !Array.isArray(item) && typeof item.id === "number" && typeof item.nombre === "string" && !platforms.has(item.id)) platforms.set(item.id, { id: item.id, nombre: item.nombre });
      }
    }
    return response({ plataformas: [...platforms.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.id - b.id) });
  }
  const id = params.get("id");
  if (id) {
    if (!/^\d{1,20}$/.test(id) || BigInt(id) > 18446744073709551615n) return response({ error: "ID inválido" }, 400);
    const item = await prisma.emailDeletionAudit.findUnique({ where: { id: BigInt(id) } });
    return item ? response({ item: serialize(item) }) : response({ error: "Registro no encontrado" }, 404);
  }
  let filters;
  try { filters = deletionAuditFilters(params); } catch (error) { return response({ error: (error as Error).message }, 400); }
  const { where, page, order, take } = filters;
  const [total, items] = await prisma.$transaction([
    prisma.emailDeletionAudit.count({ where }),
    prisma.emailDeletionAudit.findMany({ where, skip: (page - 1) * take, take, orderBy: [{ fechaEliminacion: order }, { id: order }], select: { id: true, correo: true, clave: true, plataformas: true, fechaEliminacion: true, eliminadoPor: true, motivo: true, identificadorOriginal: true } }),
  ]);
  return response({ total, page, pages: Math.max(1, Math.ceil(total / take)), items: serialize(items) });
}
