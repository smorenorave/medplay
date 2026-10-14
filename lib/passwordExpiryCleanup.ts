import type { Prisma, PrismaClient } from "../src/generated/prisma";
import { randomUUID } from "node:crypto";
import { todayYMDBogota, utcDateFromYMD } from "./bogotaDate";

export type ExpiryRemoval = { revision: string; correos: string[]; deleted: number };
type Target = { tipo: "pantalla" | "completa"; id: string };
const email = (value: string) => value.trim().toLowerCase();
const snapshot = (value: unknown) => JSON.parse(JSON.stringify(value, (_k, v) => typeof v === "bigint" ? String(v) : v));

/** Update credentials and delete expired assignments atomically. Never cascade
 * through contacts or parent accounts, which may still have valid services. */
export async function passwordExpiryTransaction<T>(db: PrismaClient, target: Target, password: string | null | undefined, adminId: number | null, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async tx => {
    const readSelected = async () => {
      if (target.tipo === "completa") {
        const row = await tx.cuentascompletas.findUnique({ where: { id: BigInt(target.id) } });
        return row && { correo: row.correo, password: row.contrasena, expiry: row.fecha_vencimiento };
      }
      const row = await tx.pantallas.findUnique({ where: { id: Number(target.id) }, include: { cuentascompartidas: true } });
      return row && { correo: row.cuentascompartidas.correo, password: row.cuentascompartidas.contrasena, expiry: row.fecha_vencimiento };
    };
    const before = password === undefined ? null : await readSelected();
    const cutoff = utcDateFromYMD(todayYMDBogota());
    const triggered = !!before?.expiry && before.expiry <= cutoff && (password ?? "") !== before.password && !!email(before.correo);
    if (triggered && !adminId) throw new Error("unauthorized-expiry-cleanup");
    const value = await work(tx);
    let deletion: ExpiryRemoval | null = null;
    if (triggered && before) {
      const after = await readSelected();
      // Preserve renewals and reassignment made in the same edit.
      if (after?.expiry && after.expiry <= cutoff && email(after.correo) === email(before.correo)) {
        const correo = email(before.correo);
        const completeIds = await tx.$queryRaw<{ id: bigint }[]>`SELECT id FROM cuentascompletas WHERE LOWER(TRIM(correo)) = ${correo} AND fecha_vencimiento <= ${cutoff} FOR UPDATE`;
        const screenIds = await tx.$queryRaw<{ id: number }[]>`SELECT p.id FROM pantallas p INNER JOIN cuentascompartidas c ON c.id = p.cuenta_id WHERE LOWER(TRIM(c.correo)) = ${correo} AND p.fecha_vencimiento <= ${cutoff} FOR UPDATE`;
        const completas = await tx.cuentascompletas.findMany({ where: { id: { in: completeIds.map(r => r.id) } }, include: { plataformas: true } });
        const pantallas = await tx.pantallas.findMany({ where: { id: { in: screenIds.map(r => r.id) } }, include: { cuentascompartidas: { include: { plataformas: true } } } });
        for (const row of completas) {
          await tx.deletedAccountHistory.create({ data: {
            dedupeKey: `completa:${row.id}:${randomUUID()}`, plataformaId: row.plataforma_id, plataforma: row.plataformas.nombre,
            correo: row.correo, clave: row.contrasena, proveedor: row.proveedor, tipoRegistro: "CUENTA_COMPLETA", tipoEliminacion: "CUENTA_COMPLETA",
            identificadorOriginal: String(row.id), eliminadoPorAdminId: adminId, datosRecuperacion: snapshot({ cuenta: row }),
          } });
        }
        for (const row of pantallas) {
          const account = row.cuentascompartidas;
          await tx.deletedAccountHistory.create({ data: {
            dedupeKey: `pantalla:${row.id}:${randomUUID()}`, plataformaId: account.plataforma_id, plataforma: account.plataformas?.nombre ?? "Sin plataforma",
            correo: account.correo, clave: account.contrasena, proveedor: account.proveedor, tipoRegistro: "PANTALLA", tipoEliminacion: "PANTALLA",
            identificadorOriginal: String(row.id), eliminadoPorAdminId: adminId, datosRecuperacion: snapshot({ cuentaId: account.id, numeroPantalla: row.nro_pantalla, contacto: row.contacto, pantalla: row }),
          } });
        }
        const removedScreens = await tx.pantallas.deleteMany({ where: { id: { in: screenIds.map(r => r.id) }, fecha_vencimiento: { lte: cutoff } } });
        const removedComplete = await tx.cuentascompletas.deleteMany({ where: { id: { in: completeIds.map(r => r.id) }, fecha_vencimiento: { lte: cutoff } } });
        if (removedScreens.count !== pantallas.length || removedComplete.count !== completas.length) throw new Error("expiry-cleanup-conflict");
        const revision = await tx.accountDataRevision.upsert({ where: { id: 1 }, create: { id: 1, revision: 1n }, update: { revision: { increment: 1n } } });
        deletion = { revision: String(revision.revision), correos: [], deleted: removedScreens.count + removedComplete.count };
      }
    }
    return { value, deletion };
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 });
}

export function expiryHeaders(deletion: ExpiryRemoval | null): Record<string, string> {
  return deletion ? { "X-Expired-Records-Deleted": JSON.stringify(deletion) } : {};
}
