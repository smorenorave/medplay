import type { Prisma, PrismaClient } from "../src/generated/prisma";

// Kept as a compatibility name for the existing edit handlers. No deletion occurs.
export type ExpiryRemoval = { revision: string; correos: string[]; managed: number };
type Target = { tipo: "pantalla" | "completa"; id: string };
const email = (value: string) => value.trim().toLowerCase();

/** Password update and persistent management state commit or roll back together. */
export async function passwordExpiryTransaction<T>(db: PrismaClient, target: Target, password: string | null | undefined, adminId: number | null, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async tx => {
    const readSelected = async () => {
      if (target.tipo === "completa") {
        const row = await tx.cuentascompletas.findUnique({ where: { id: BigInt(target.id) } });
        return row && { correo: row.correo, password: row.contrasena, plataformaId: row.plataforma_id };
      }
      const row = await tx.pantallas.findUnique({ where: { id: Number(target.id) }, include: { cuentascompartidas: true } });
      return row && { correo: row.cuentascompartidas.correo, password: row.cuentascompartidas.contrasena, plataformaId: row.cuentascompartidas.plataforma_id };
    };
    const before = password === undefined ? null : await readSelected();
    const changed = !!before && (password ?? "") !== before.password;
    if (changed && !adminId) throw new Error("unauthorized-expiry-cleanup");
    const value = await work(tx);
    let deletion: ExpiryRemoval | null = null;
    if (changed) {
      const after = await readSelected();
      if (!after || after.plataformaId == null || !email(after.correo)) throw new Error("No se pudo identificar el correo y la plataforma del registro.");
      const correo = email(after.correo), platform = after.plataformaId;
      const completeIds = await tx.$queryRaw<{ id: bigint }[]>`SELECT id FROM cuentascompletas WHERE LOWER(TRIM(correo)) = ${correo} AND plataforma_id = ${platform} FOR UPDATE`;
      const screenIds = await tx.$queryRaw<{ id: number; cuenta_id: number }[]>`SELECT p.id, p.cuenta_id FROM pantallas p INNER JOIN cuentascompartidas c ON c.id = p.cuenta_id WHERE LOWER(TRIM(c.correo)) = ${correo} AND c.plataforma_id = ${platform} FOR UPDATE`;
      const passwordManagedAt = new Date();
      await tx.cuentascompartidas.updateMany({ where: { id: { in: [...new Set(screenIds.map(r => r.cuenta_id))] } }, data: { contrasena: after.password } });
      const completas = await tx.cuentascompletas.updateMany({ where: { id: { in: completeIds.map(r => r.id) } }, data: { passwordManagedAt, contrasena: after.password } });
      const pantallas = await tx.pantallas.updateMany({ where: { id: { in: screenIds.map(r => r.id) } }, data: { passwordManagedAt } });
      const revision = await tx.accountDataRevision.upsert({ where: { id: 1 }, create: { id: 1, revision: 1n }, update: { revision: { increment: 1n } } });
      deletion = { revision: String(revision.revision), correos: [], managed: completas.count + pantallas.count };
    }
    return { value, deletion };
  }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 });
}

export function expiryHeaders(result: ExpiryRemoval | null): Record<string, string> {
  return result ? { "X-Password-Records-Managed": JSON.stringify(result) } : {};
}
