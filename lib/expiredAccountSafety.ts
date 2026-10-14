import { isCivilDate, todayYMDBogota } from "./bogotaDate";
export const ACTIVE_ACCOUNT_WARNING = "No se puede eliminar esta cuenta porque tiene usuarios activos asociados. Debes verificar y resolver estas asignaciones antes de continuar.";
export class AccountSafetyError extends Error { constructor(message: string) { super(message); this.name = "AccountSafetyError"; } }
type Assignment = { fecha_vencimiento?: Date | string | null; estado?: string | null };
function expirationYMD(row: Assignment): string | null {
  const value = row.fecha_vencimiento;
  const ymd = value instanceof Date
    ? (Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : "")
    : (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value) ? value.slice(0, 10) : "");
  return isCivilDate(ymd) ? ymd : null;
}
export function hasActiveAssignment(row: Assignment) {
  const expiry = expirationYMD(row);
  // ACTIVA is a saved label, not proof of a renewal. A valid expiry wins.
  // Preserve the existing today-expiry policy and fail closed for unknown dates.
  return expiry === null || expiry > todayYMDBogota();
}
export function assignmentStatusLabel(row: Assignment): string {
  const expiry = expirationYMD(row);
  if (expiry === null) return "FECHA NO VERIFICABLE";
  const today = todayYMDBogota();
  return expiry < today ? "VENCIDA" : expiry === today ? "VENCE HOY" : "ACTIVA";
}
export type ConfirmedAccount = { correo: string; clave: string; plataformaId: number; confirmado: true };
