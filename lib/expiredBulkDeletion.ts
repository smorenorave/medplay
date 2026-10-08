import { type PrismaClient } from "../src/generated/prisma";
import { createHash, randomUUID } from "node:crypto";
import { serializable, normalizeEmail } from "./emailDeletion";
import { AccountSafetyError, hasActiveAssignment } from "./expiredAccountSafety";

export type ExpiredBulkTarget = { tipo: "pantalla" | "completa"; id: string };
export type ExpiredBulkResult = {
  correos: string[]; revision: string; eliminated: number;
  skipped: (ExpiredBulkTarget & { correo?: string; reason: string })[];
};

/** Explicit, scoped removal. Never archives credentials or removes unselected assignments. */
export async function deleteExpiredBulk(db: PrismaClient, input: {
  adminId: number; targets: ExpiredBulkTarget[]; confirmed: boolean;
}): Promise<ExpiredBulkResult> {
  if (input.confirmed !== true) throw new AccountSafetyError("Debes confirmar la eliminación definitiva de todos los registros seleccionados.");
  if (!input.targets.length || input.targets.length > 100) throw new AccountSafetyError("Selecciona entre 1 y 100 registros.");
  const targets = [...new Map(input.targets.map(target => [`${target.tipo}:${target.id}`, target])).values()]
    .sort((a, b) => `${a.tipo}:${a.id}`.localeCompare(`${b.tipo}:${b.id}`));
  return serializable(db, async tx => {
    const actor = await tx.admin.findUnique({ where: { id: input.adminId }, select: { usuario: true } });
    if (!actor) throw new Error("unauthorized");
    const skipped: ExpiredBulkResult["skipped"] = [];
    const correos = new Set<string>();
    const parents = new Set<number>();
    let revision: bigint | undefined;
    let eliminated = 0;
    for (const target of targets) {
      // Serializable reads protect the assignment checks from concurrent edits.
      const screen = target.tipo === "pantalla" ? await tx.pantallas.findUnique({ where: { id: Number(target.id) }, include: { cuentascompartidas: { include: { plataformas: true } } } }) : null;
      const complete = target.tipo === "completa" ? await tx.cuentascompletas.findUnique({ where: { id: BigInt(target.id) }, include: { plataformas: true } }) : null;
      const account = screen?.cuentascompartidas ?? complete;
      const assignment = screen ?? complete;
      if (!account || !assignment) {
        skipped.push({ ...target, reason: "El registro ya no existe." });
        continue;
      }
      if (hasActiveAssignment(assignment)) {
        skipped.push({ ...target, correo: account.correo, reason: "Tiene asignaciones activas o una fecha de vencimiento no verificable." });
        continue;
      }
      const removed = screen
        ? await tx.pantallas.deleteMany({ where: { id: screen.id } })
        : await tx.cuentascompletas.deleteMany({ where: { id: complete!.id } });
      if (!removed.count) {
        skipped.push({ ...target, correo: account.correo, reason: "El registro ya no existe." });
        continue;
      }
      if (screen) parents.add(screen.cuenta_id);
      if (revision === undefined) revision = (await tx.accountDataRevision.upsert({ where: { id: 1 }, create: { id: 1, revision: 1n }, update: { revision: { increment: 1n } } })).revision;
      const correo = normalizeEmail(account.correo);
      const fechaEliminacion = new Date();
      // Allowlisted metadata only: no account snapshots, passwords or password hashes.
      const dedupeKey = createHash("sha256").update(randomUUID()).digest("hex");
      await tx.emailDeletionAudit.upsert({ where: { dedupeKey }, update: {}, create: {
        dedupeKey, correo, clave: null, claves: "",
        plataformas: account.plataformas ? [{ id: account.plataformas.id, nombre: account.plataformas.nombre }] : [],
        contactos: [], identificadorOriginal: `${target.tipo}:${target.id}`,
        adminId: input.adminId, eliminadoPor: actor.usuario, fechaEliminacion, revision,
        motivo: "Eliminación definitiva en lote desde Vencimientos",
        registros: { operacion: "vencimientos-eliminacion-masiva", tipo: target.tipo, id: target.id, plataformaId: account.plataforma_id },
      } });
      correos.add(correo);
      eliminated += removed.count;
    }
    for (const id of [...parents].sort((a, b) => a - b)) {
      const remaining = await tx.pantallas.findMany({ where: { cuenta_id: id }, select: { id: true } });
      if (!remaining.length) await tx.cuentascompartidas.deleteMany({ where: { id } });
    }
    if (revision !== undefined) await tx.metricasmensuales.deleteMany({});
    else revision = (await tx.accountDataRevision.findUnique({ where: { id: 1 } }))?.revision ?? 0n;
    return { correos: [...correos], revision: String(revision), eliminated, skipped };
  });
}
