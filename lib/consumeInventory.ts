import type { Prisma } from "../src/generated/prisma";

export class InventoryUnavailableError extends Error {
  constructor() {
    super("El registro de inventario ya fue utilizado o cambió. Selecciona otro disponible.");
  }
}

/** Must run in the same transaction as the sale. The conditional DELETE locks
 * the row, so a concurrent claimant waits and then observes count = 0.
 * A failed sale rolls the DELETE back; no sales or shared accounts are deleted.
 */
export async function consumeInventory(
  tx: Prisma.TransactionClient,
  inventoryId: unknown,
  plataformaId: number | null | undefined,
  correo: string | null | undefined,
) {
  if (inventoryId == null) return;
  if (typeof inventoryId !== "number" || !Number.isSafeInteger(inventoryId) || inventoryId <= 0 || !plataformaId || !correo) {
    throw new InventoryUnavailableError();
  }
  const removed = await tx.inventario.deleteMany({
    where: { id: inventoryId, plataforma_id: plataformaId, correo: correo.trim().toLowerCase() },
  });
  if (removed.count !== 1) throw new InventoryUnavailableError();
}
