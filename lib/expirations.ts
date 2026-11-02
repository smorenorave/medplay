import type { PrismaClient } from "../src/generated/prisma";
import { todayYMDBogota } from "./bogotaDate";

/** Read the operational rows in one snapshot. Password management is metadata,
 * never a cancellation or deletion. SQL DATE values remain civil dates. */
export async function readExpirations(db: PrismaClient) {
  return db.$transaction(async tx => {
    const today = todayYMDBogota();
    const accounts = await tx.cuentascompletas.findMany({
      where: { fecha_vencimiento: { not: null } },
      include: { usuarios: { select: { nombre: true } } }, orderBy: { id: "asc" },
    });
    const screens = await tx.pantallas.findMany({
      include: { usuarios: { select: { nombre: true } }, cuentascompartidas: true }, orderBy: { id: "asc" },
    });
    const date = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
    const items = [
      ...accounts.map(row => ({
        ...row, id: String(row.id), tipo: "cuenta" as const, nombre: row.usuarios.nombre,
        fecha_compra: date(row.fecha_compra), fecha_vencimiento: date(row.fecha_vencimiento),
        total_pagado: row.total_pagado_completa == null ? null : Number(row.total_pagado_completa),
        total_pagado_proveedor: row.total_pagado_proveedor_completa == null ? null : Number(row.total_pagado_proveedor_completa),
        total_ganado: row.total_ganado == null ? null : Number(row.total_ganado),
      })),
      ...screens.map(({ cuentascompartidas: account, usuarios, ...row }) => ({
        ...row, id: String(row.id), tipo: "pantalla" as const, nombre: usuarios.nombre,
        correo: account.correo, contrasena: account.contrasena, proveedor: account.proveedor, plataforma_id: account.plataforma_id,
        fecha_compra: date(row.fecha_compra), fecha_vencimiento: date(row.fecha_vencimiento),
        total_pagado: row.total_pagado == null ? null : Number(row.total_pagado),
        total_pagado_proveedor: row.total_pagado_proveedor == null ? null : Number(row.total_pagado_proveedor),
        total_ganado: row.total_ganado == null ? null : Number(row.total_ganado),
      })),
    ];
    return { today, timeZone: "America/Bogota", items };
  }, { isolationLevel: "RepeatableRead" });
}
