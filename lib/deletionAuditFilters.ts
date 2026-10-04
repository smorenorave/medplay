import type { Prisma } from "../src/generated/prisma";

export function deletionAuditFilters(params: URLSearchParams) {
  const correo = (params.get("correo") ?? "").trim();
  const clave = (params.get("clave") ?? "").trim();
  const plataforma = params.get("plataforma");
  const page = Number(params.get("page") ?? 1);
  const order = params.get("order") ?? "desc";
  if (correo.length > 191 || clave.length > 255 || !Number.isSafeInteger(page) || page < 1 || page > 100000 || !["asc", "desc"].includes(order)) throw new Error("Filtros inválidos");
  const where: Prisma.emailDeletionAuditWhereInput = {};
  if (correo) where.correo = { contains: correo.toLowerCase() };
  if (clave) where.claves = { contains: clave };
  if (plataforma) {
    if (!/^\d+$/.test(plataforma) || !Number.isSafeInteger(Number(plataforma)) || Number(plataforma) < 1) throw new Error("Plataforma inválida");
    where.plataformas = { array_contains: [{ id: Number(plataforma) }] };
  }
  const date = (name: string) => {
    const value = params.get(name);
    if (!value) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Fecha inválida");
    const parsed = new Date(`${value}T05:00:00.000Z`); // Bogotá, inclusive calendar dates.
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Fecha inválida");
    return parsed;
  };
  const from = date("desde"), to = date("hasta");
  if (from && to && from > to) throw new Error("Rango de fechas inválido");
  if (to) to.setUTCDate(to.getUTCDate() + 1);
  if (from || to) where.fechaEliminacion = { gte: from, lt: to };
  return { where, page, order: order as "asc" | "desc", take: 25 };
}
