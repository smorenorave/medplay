"use client";
import { applyAccountDeletion } from "./accountDataChanges";
import { recordPasswordChange } from "./passwordChanges";

/** Only refresh after the server commits the management state. */
export function applyPasswordExpiryDeletion(response: Response, correo: string, password: string, plataformaId?: number) {
  const header = response.headers.get("X-Password-Records-Managed");
  if (!header) return false;
  const result = JSON.parse(header);
  if (!response.ok || !/^\d+$/.test(result.revision) || !Number.isInteger(result.managed) || result.managed < 1) throw new Error("Respuesta de gestión inválida. Actualiza el listado.");
  applyAccountDeletion({ revision: result.revision, correos: [] });
  recordPasswordChange(correo, password, plataformaId);
  return true;
}
