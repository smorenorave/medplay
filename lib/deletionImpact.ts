import { createHash } from "node:crypto";
import { Prisma } from "../src/generated/prisma";

export class DeletionConfirmationError extends Error {}

/** Read inside the same serializable transaction as the eventual deletion. */
export async function deletionImpact(tx: Prisma.TransactionClient, emails: string[]) {
  const correos = [...new Set(emails.map(value => value.trim().toLowerCase()))].sort();
  const records = [];
  const contacts = new Set<string>();
  const totals = { completas: 0, compartidas: 0, pantallas: 0, inventario: 0 };
  for (const correo of correos) {
    const sharedIds = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`SELECT id FROM cuentascompartidas WHERE LOWER(TRIM(correo)) = ${correo} FOR UPDATE`);
    const completeIds = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`SELECT id FROM cuentascompletas WHERE LOWER(TRIM(correo)) = ${correo} FOR UPDATE`);
    const inventoryIds = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`SELECT id FROM inventario WHERE LOWER(TRIM(correo)) = ${correo} FOR UPDATE`);
    const shared = await tx.cuentascompartidas.findMany({ where: { id: { in: sharedIds.map(row => row.id) } }, select: { id: true, plataforma_id: true }, orderBy: { id: "asc" } });
    const complete = await tx.cuentascompletas.findMany({ where: { id: { in: completeIds.map(row => row.id) } }, select: { id: true, contacto: true, plataforma_id: true }, orderBy: { id: "asc" } });
    const inventory = await tx.inventario.findMany({ where: { id: { in: inventoryIds.map(row => row.id) } }, select: { id: true, plataforma_id: true }, orderBy: { id: "asc" } });
    const screens = await tx.pantallas.findMany({ where: { cuenta_id: { in: shared.map(row => row.id) } }, select: { id: true, cuenta_id: true, contacto: true }, orderBy: { id: "asc" } });
    for (const row of [...complete, ...screens]) contacts.add(row.contacto);
    totals.completas += complete.length; totals.compartidas += shared.length;
    totals.pantallas += screens.length; totals.inventario += inventory.length;
    records.push({ correo, shared, complete, inventory, screens });
  }
  const clients = await tx.usuarios.findMany({ where: { contacto: { in: [...contacts] } }, select: { contacto: true }, orderBy: { contacto: "asc" } });
  const fingerprint = createHash("sha256").update(JSON.stringify({ records, clients }, (_key, value) => typeof value === "bigint" ? String(value) : value)).digest("hex");
  return { correos, ...totals, clientesAsociados: clients.length, fingerprint };
}
