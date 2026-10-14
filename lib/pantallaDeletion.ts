import type { PrismaClient } from "../src/generated/prisma";
import { randomUUID } from "node:crypto";

export class PantallaDeletionError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

export type PantallaDecision = { cuentaId: number; action: "record" | "inventory" | "purge" | "assignment" };

/** Lock the parent before counting children. Serializable also protects the child
 * range against reassignment/insertion and rolls back every write on conflict. */
export async function pantallaDeletion(db: PrismaClient, id: number, adminId: number, decision?: PantallaDecision) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async tx => {
        const identity = await tx.pantallas.findUnique({ where: { id }, select: { cuenta_id: true } });
        if (!identity) throw new PantallaDeletionError("La pantalla ya no existe. Actualiza el listado.", 404);
        await tx.$queryRaw`SELECT id FROM cuentascompartidas WHERE id = ${identity.cuenta_id} FOR UPDATE`;
        const row = await tx.pantallas.findUnique({ where: { id }, include: { cuentascompartidas: { include: { plataformas: { select: { nombre: true } } } } } });
        if (!row || row.cuenta_id !== identity.cuenta_id) throw new PantallaDeletionError("La asignación cambió. Vuelve a revisarla.");
        const account = row.cuentascompartidas;
        const count = await tx.pantallas.count({ where: { cuenta_id: account.id } });
        const last = count === 1;
        if (!decision) return { cuentaId: account.id, last, count };
        if (decision.cuentaId !== account.id || (decision.action === "assignment" ? !row.passwordManagedAt : last !== (decision.action !== "record"))) {
          throw new PantallaDeletionError("Las asignaciones de la cuenta cambiaron. Cierra y vuelve a abrir la eliminación para elegir qué hacer.");
        }
        if (decision.action === "inventory") {
          if (account.plataforma_id == null) throw new PantallaDeletionError("La cuenta necesita una plataforma para enviarla a inventario.");
          // Inventory has a platform/email unique key, not an account relation.
          // Never overwrite another account's credentials or advertise active stock.
          const other = await tx.cuentascompartidas.findFirst({ where: { id: { not: account.id }, correo: account.correo, plataforma_id: account.plataforma_id } });
          const complete = await tx.cuentascompletas.findFirst({ where: { correo: account.correo, plataforma_id: account.plataforma_id } });
          if (other || complete) throw new PantallaDeletionError("Otra cuenta comparte correo y plataforma. No se puede identificar su inventario sin ambigüedad; no se guardó ningún cambio.");
          const existing = await tx.inventario.findUnique({ where: { plataforma_id_correo: { plataforma_id: account.plataforma_id, correo: account.correo } } });
          if (existing && existing.clave !== account.contrasena) throw new PantallaDeletionError("Ya existe inventario con otras credenciales. No se guardó ningún cambio.");
          if (!existing) await tx.inventario.create({ data: { plataforma_id: account.plataforma_id, correo: account.correo, clave: account.contrasena } });
        }
        // Append an independent snapshot: never replace earlier financial/history data.
        await tx.deletedAccountHistory.create({ data: {
          dedupeKey: `pantalla:${id}:${randomUUID()}`, plataformaId: account.plataforma_id,
          plataforma: account.plataformas?.nombre ?? "Sin plataforma", correo: account.correo,
          clave: account.contrasena, proveedor: account.proveedor, tipoRegistro: "PANTALLA",
          tipoEliminacion: decision.action === "inventory" ? "INVENTARIO" : "PANTALLA",
          identificadorOriginal: String(id), eliminadoPorAdminId: adminId,
          datosRecuperacion: JSON.parse(JSON.stringify({ cuentaId: account.id, numeroPantalla: row.nro_pantalla, contacto: row.contacto, pantalla: row })),
        } });
        await tx.pantallas.delete({ where: { id, cuenta_id: account.id } });
        if (decision.action === "purge") {
          // Do not rely on the account -> screens cascade, even under a lock.
          const removed = await tx.cuentascompartidas.deleteMany({ where: { id: account.id, pantallas: { none: {} } } });
          if (removed.count !== 1) throw new PantallaDeletionError("La cuenta conserva dependencias; no se guardó ningún cambio.");
        }
        const revision = await tx.accountDataRevision.upsert({ where: { id: 1 }, create: { id: 1, revision: 1n }, update: { revision: { increment: 1n } } });
        return { cuentaId: account.id, last, count: count - 1, deleted: true, archived: decision.action === "inventory", revision: String(revision.revision), correos: [] as string[] };
      }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 });
    } catch (error) {
      if (attempt < 3 && ["P2034", "P2002"].includes((error as { code?: string }).code ?? "")) continue;
      throw error;
    }
  }
}
