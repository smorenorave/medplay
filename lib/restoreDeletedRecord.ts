import { z } from "zod";
import { Prisma, type PrismaClient } from "../src/generated/prisma";
import { normalizeEmail, serializable } from "./emailDeletion";

export class RestorationError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
const intId = z.number().int().positive().max(2147483647);
const bigId = z.union([z.string().regex(/^[1-9]\d{0,19}$/), z.number().int().positive().safe()]).transform(value => BigInt(value)).refine(value => value <= 18446744073709551615n);
const date = z.string().refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) || z.string().datetime().safeParse(value).success).refine(value => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value.slice(0, 10);
}).transform(value => new Date(value));
const money = z.union([z.number().finite(), z.string().regex(/^-?\d+(\.\d+)?$/)]).nullable().optional();
const sharedSchema = z.object({ id: intId, correo: z.string().min(1).max(100), contrasena: z.string().max(100), proveedor: z.string().max(50).nullable().optional(), plataforma_id: intId.nullable(), cuenta_caida: z.boolean().optional() });
const screenSchema = z.object({
  id: intId, cuenta_id: intId, contacto: z.string().min(1).max(191), nro_pantalla: z.string().min(1).max(50), pin: z.string().max(50).nullable().optional(),
  fecha_compra: date, fecha_vencimiento: date, estado: z.string().max(20), comentario: z.string().nullable().optional(), meses_pagados: z.number().int().nullable().optional(),
  total_pagado: money, total_pagado_proveedor: money, total_ganado: money,
});
const completeSchema = z.object({
  id: bigId, correo: z.string().min(1).max(100), contrasena: z.string().max(100), plataforma_id: intId, contacto: z.string().min(1).max(191), proveedor: z.string().max(64).nullable().optional(),
  fecha_compra: date.nullable(), fecha_vencimiento: date.nullable(), estado: z.string().max(20).nullable().optional(), comentario: z.string().nullable().optional(), meses_pagados: z.number().int().nullable().optional(),
  total_pagado_completa: money, total_pagado_proveedor_completa: money, total_ganado: money,
});
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const rows = (value: unknown) => Array.isArray(value) ? value.map(object) : [];
const snapshot = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new RestorationError("El respaldo no contiene todos los datos necesarios para restaurar este registro.");
  return parsed.data;
};

export type RestorationTarget = { auditId: string; evento: number; tipo: "pantalla" | "completa"; id: string };
export async function restoreDeletedRecord(db: PrismaClient, target: RestorationTarget, adminId: number) {
  return serializable(db, async tx => {
    const actor = await tx.admin.findUnique({ where: { id: adminId }, select: { usuario: true } });
    if (!actor) throw new RestorationError("No autorizado", 401);
    const audit = await tx.emailDeletionAudit.findUnique({ where: { id: BigInt(target.auditId) } });
    if (!audit) throw new RestorationError("Auditoría no encontrada", 404);
    const registros = object(audit.registros);
    const eventos = rows(registros.eventos);
    if (target.evento !== eventos.length - 1) throw new RestorationError("El historial cambió. Actualiza los detalles antes de restaurar.");
    const event = eventos[target.evento];
    if (!event) throw new RestorationError("No se encontró el respaldo de la eliminación.");
    const restores = rows(registros.restauraciones);
    const previous = restores.find(row => row.evento === target.evento && row.tipo === target.tipo && row.id === target.id);
    if (previous) return { revision: String((await tx.accountDataRevision.findUnique({ where: { id: 1 } }))?.revision ?? 0n), correos: [audit.correo], alreadyRestored: true };

    const originals = rows(target.tipo === "pantalla" ? event.pantallas : event.cuentascompletas);
    const original = originals.find(row => String(row.id) === target.id);
    if (!original) throw new RestorationError("El registro no pertenece a este respaldo.", 404);
    const data = target.tipo === "pantalla" ? snapshot(screenSchema, original) : snapshot(completeSchema, original);
    const account = target.tipo === "pantalla"
      ? snapshot(sharedSchema, rows(event.cuentascompartidas).find(row => row.id === original.cuenta_id))
      : snapshot(completeSchema, original);
    if (normalizeEmail(account.correo) !== normalizeEmail(audit.correo)) throw new RestorationError("El respaldo no corresponde al correo de esta auditoría.");
    if (account.plataforma_id !== null && !await tx.plataformas.findUnique({ where: { id: account.plataforma_id } })) throw new RestorationError("La plataforma original ya no existe. Debes recuperarla antes de restaurar.");

    if (target.tipo === "pantalla") {
      const screen = snapshot(screenSchema, original);
      if (await tx.pantallas.findUnique({ where: { id: screen.id } })) throw new RestorationError("La pantalla ya existe o su identificador está ocupado. No se sobrescribió ningún dato.");
      const shared = snapshot(sharedSchema, account);
      const live = await tx.cuentascompartidas.findUnique({ where: { id: shared.id } });
      if (live && (normalizeEmail(live.correo) !== normalizeEmail(shared.correo) || live.contrasena !== shared.contrasena || live.plataforma_id !== shared.plataforma_id)) throw new RestorationError("La cuenta original fue modificada o su identificador está ocupado. No se sobrescribió ningún dato.");
      if (!live) {
        const currentIds = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`SELECT id FROM cuentascompartidas WHERE LOWER(TRIM(correo)) = ${normalizeEmail(shared.correo)} FOR UPDATE`);
        const current = await tx.cuentascompartidas.findMany({ where: { id: { in: currentIds.map(row => row.id) } } });
        if (current.some(row => row.plataforma_id === shared.plataforma_id)) throw new RestorationError("Ya existe otra cuenta con este correo y plataforma. Revisa sus datos antes de restaurar.");
      }
      if ((await tx.pantallas.findMany({ where: { cuenta_id: shared.id, nro_pantalla: screen.nro_pantalla } })).length) throw new RestorationError("El número de pantalla ya está ocupado en esta cuenta.");
      if (!live) await tx.cuentascompartidas.create({ data: shared });
    } else {
      const complete = snapshot(completeSchema, original);
      if (await tx.cuentascompletas.findUnique({ where: { id: complete.id } })) throw new RestorationError("La cuenta completa ya existe o su identificador está ocupado. No se sobrescribió ningún dato.");
      const currentIds = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`SELECT id FROM cuentascompletas WHERE LOWER(TRIM(correo)) = ${normalizeEmail(complete.correo)} FOR UPDATE`);
      const current = await tx.cuentascompletas.findMany({ where: { id: { in: currentIds.map(row => row.id) } } });
      if (current.some(row => row.plataforma_id === complete.plataforma_id && row.contacto === complete.contacto && row.fecha_compra?.getTime() === complete.fecha_compra?.getTime() && row.fecha_vencimiento?.getTime() === complete.fecha_vencimiento?.getTime())) throw new RestorationError("Ya existe una cuenta completa para este cliente con los mismos datos.");
    }

    if (!await tx.usuarios.findUnique({ where: { contacto: data.contacto } })) {
      const client = rows(event.usuarios).find(row => row.contacto === data.contacto);
      if (!client || !(client.nombre === null || typeof client.nombre === "string")) throw new RestorationError("El respaldo no contiene el cliente original.");
      await tx.usuarios.create({ data: { contacto: data.contacto, nombre: client.nombre } });
    }
    if (target.tipo === "pantalla") await tx.pantallas.create({ data: snapshot(screenSchema, original) });
    else await tx.cuentascompletas.create({ data: snapshot(completeSchema, original) });

    const revision = await tx.accountDataRevision.upsert({ where: { id: 1 }, create: { id: 1, revision: 1n }, update: { revision: { increment: 1n } } });
    const restoration = { evento: target.evento, tipo: target.tipo, id: target.id, fechaRestauracion: new Date().toISOString(), adminId, restauradoPor: actor.usuario };
    await tx.emailDeletionAudit.update({ where: { id: audit.id }, data: { registros: JSON.parse(JSON.stringify({ ...registros, restauraciones: [...restores, restoration] })) as Prisma.InputJsonValue, revision: revision.revision } });
    await tx.metricasmensuales.deleteMany({});
    return { revision: String(revision.revision), correos: [audit.correo], alreadyRestored: false };
  });
}
