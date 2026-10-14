"use client";
import { applyAccountDeletion } from "./accountDataChanges";
import { notifyInventoryConsumed } from "./inventoryChanges";
export type DeletionSelection = { tipo: "pantalla" | "completa"; id: string; label?: string };
export type DeletionPreview = { cuentaId: string; last: boolean; count: number };
export async function previewRecordDeletion(item: DeletionSelection): Promise<DeletionPreview> {
  const response = await fetch("/api/record-deletions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: { tipo: item.tipo, id: item.id } }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo verificar el registro.");
  return result;
}
export async function deleteRecordSelection(item: DeletionSelection, preview: DeletionPreview, action: "record" | "inventory" | "purge") {
  const response = await fetch("/api/record-deletions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: { tipo: item.tipo, id: item.id }, decision: { cuentaId: preview.cuentaId, action } }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo eliminar el registro.");
  applyAccountDeletion(result);
  notifyInventoryConsumed();
  return result as { archived: boolean };
}
