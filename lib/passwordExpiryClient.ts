"use client";
import { applyAccountDeletion } from "./accountDataChanges";
import { recordPasswordChange } from "./passwordChanges";

/** Only react to a committed server deletion; never infer deleted IDs locally. */
export function applyPasswordExpiryDeletion(response: Response, correo: string, password: string, plataformaId?: number) {
  const header = response.headers.get("X-Expired-Records-Deleted");
  if (!header) return false;
  const result = JSON.parse(header);
  if (!response.ok || !/^\d+$/.test(result.revision) || !Number.isInteger(result.deleted) || result.deleted < 1) throw new Error("Respuesta de eliminación inválida. Actualiza el listado.");
  applyAccountDeletion({ revision: result.revision, correos: [] });
  recordPasswordChange(correo, password, plataformaId);
  return true;
}
