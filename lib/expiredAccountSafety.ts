import { todayYMDBogota } from "./bogotaDate";
export const ACTIVE_ACCOUNT_WARNING = "No se puede eliminar esta cuenta porque tiene usuarios activos asociados. Debes verificar y resolver estas asignaciones antes de continuar.";
export class AccountSafetyError extends Error { constructor(message: string) { super(message); this.name = "AccountSafetyError"; } }
type Assignment = { fecha_vencimiento?: Date | string | null; estado?: string | null };
export function hasActiveAssignment(row: Assignment) {
  if (["ACTIVA", "ACTIVO", "ACTIVE", "VIGENTE"].includes((row.estado ?? "").trim().toUpperCase())) return true;
  if (!row.fecha_vencimiento) return true; // Unknown expiry must never authorize destructive removal.
  const date = new Date(row.fecha_vencimiento);
  return !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) >= todayYMDBogota();
}
export type ConfirmedAccount = { correo: string; clave: string; plataformaId: number; confirmado: true };
