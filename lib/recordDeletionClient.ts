"use client";
import { applyAccountDeletion } from "./accountDataChanges";
import { notifyInventoryConsumed } from "./inventoryChanges";
export type DeletionSelection = { tipo: "pantalla" | "completa"; id: string; label?: string };
export type DeletionPreview = { cuentaId: string; last: boolean; count: number };
async function readResponse(response: Response) {
  if (response.status === 401) throw new Error("Tu sesión venció o no se pudo validar. Vuelve a iniciar sesión antes de intentar esta operación.");
  if (response.status === 403) throw new Error("Tu sesión no tiene permiso para esta operación. Inicia sesión como administrador.");
  const result = await response.json().catch(() => null);
  if (!result) throw new Error(`El servidor devolvió una respuesta inválida (HTTP ${response.status}). No se pudo confirmar el resultado; actualiza el listado antes de reintentar.`);
  if (!response.ok) throw new Error(result.error || `No se pudo completar la solicitud (HTTP ${response.status}).`);
  return result;
}
export async function previewRecordDeletion(item: DeletionSelection): Promise<DeletionPreview> {
  const response = await fetch("/api/record-deletions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: { tipo: item.tipo, id: item.id } }) });
  const result = await readResponse(response);
  return result;
}
export async function deleteRecordSelection(item: DeletionSelection, preview: DeletionPreview, action: "record" | "inventory" | "purge") {
  const response = await fetch("/api/record-deletions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: { tipo: item.tipo, id: item.id }, decision: { cuentaId: preview.cuentaId, action } }) });
  const result = await readResponse(response);
  applyAccountDeletion(result);
  notifyInventoryConsumed();
  return result as { archived: boolean };
}
