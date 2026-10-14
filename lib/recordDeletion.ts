import type { PrismaClient } from "../src/generated/prisma";
import { randomUUID } from "node:crypto";
import { pantallaDeletion, PantallaDeletionError } from "./pantallaDeletion";

export type RecordTarget = { tipo: "pantalla" | "completa"; id: string };
export type RecordDecision = { cuentaId: string; action: "record" | "inventory" | "purge" | "assignment" };

/** Shared scoped deletion. It never deletes all records matching an email. */
export async function recordDeletion(db: PrismaClient, target: RecordTarget, adminId: number, decision?: RecordDecision) {
  if (target.tipo === "pantalla") {
    const result = await pantallaDeletion(db, Number(target.id), adminId, decision ? { cuentaId: Number(decision.cuentaId), action: decision.action } : undefined);
    return { ...result, cuentaId: String(result.cuentaId) };
  }
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const id = BigInt(target.id);
        await tx.$queryRaw`SELECT id FROM cuentascompletas WHERE id = ${id} FOR UPDATE`;
        const row = await tx.cuentascompletas.findUnique({ where: { id }, include: { plataformas: { select: { nombre: true } } } });
        if (!row) throw new PantallaDeletionError("La cuenta ya no existe. Actualiza el listado.", 404);
        const email = row.correo.trim().toLowerCase();
        const related = await tx.$queryRaw<{ id: bigint }[]>`SELECT id FROM cuentascompletas WHERE LOWER(TRIM(correo)) = ${email} AND plataforma_id = ${row.plataforma_id} FOR UPDATE`;
        const count = related.length, last = count === 1;
        if (!decision) return { cuentaId: String(id), last, count };
        if (decision.cuentaId !== String(id) || (decision.action === "assignment" ? !row.passwordManagedAt : last !== (decision.action !== "record"))) throw new PantallaDeletionError("Las asociaciones cambiaron. Vuelve a revisar la selección y su destino.");
        if (decision.action === "inventory") {
          const shared = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM cuentascompartidas WHERE LOWER(TRIM(correo)) = ${email} AND plataforma_id = ${row.plataforma_id} FOR UPDATE`;
          if (shared.length) throw new PantallaDeletionError("Otra cuenta compartida utiliza este correo y plataforma. No se puede enviarla a inventario sin resolver esa asociación.");
          const existing = await tx.inventario.findUnique({ where: { plataforma_id_correo: { plataforma_id: row.plataforma_id, correo: email } } });
          if (existing && existing.clave !== row.contrasena) throw new PantallaDeletionError("Inventario contiene otras credenciales. No se guardó ningún cambio.");
          if (!existing) await tx.inventario.create({ data: { plataforma_id: row.plataforma_id, correo: email, clave: row.contrasena } });
        }
        await tx.deletedAccountHistory.create({ data: {
          dedupeKey: `completa:${id}:${randomUUID()}`, plataformaId: row.plataforma_id,
          plataforma: row.plataformas?.nombre ?? "Sin plataforma", correo: row.correo,
          clave: row.contrasena, proveedor: row.proveedor, tipoRegistro: "CUENTA_COMPLETA",
          tipoEliminacion: decision.action === "inventory" ? "INVENTARIO" : "CUENTA_COMPLETA",
          identificadorOriginal: String(id), eliminadoPorAdminId: adminId,
          datosRecuperacion: JSON.parse(JSON.stringify({ cuenta: row }, (_key, value) => typeof value === "bigint" ? String(value) : value)),
        } });
        await tx.cuentascompletas.delete({ where: { id } });
        const revision = await tx.accountDataRevision.upsert({ where: { id: 1 }, create: { id: 1, revision: 1n }, update: { revision: { increment: 1n } } });
        return { cuentaId: String(id), last, count: count - 1, deleted: true, archived: decision.action === "inventory", revision: String(revision.revision), correos: [] as string[] };
      }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 });
    } catch (error) {
      if (attempt < 3 && ["P2034", "P2002"].includes((error as { code?: string }).code ?? "")) continue;
      throw error;
    }
  }
}
