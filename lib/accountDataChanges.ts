"use client";

const EVENT = "account-data-deleted";
const KEY = "__account_data_revision";
const MESSAGE = "__account_data_deleted";
const invalidators = new Set<() => void>();
export type AccountDeletion = { revision: string; correos: string[] };
let generation = 0;
export const accountDataEpoch = () => generation;
/** A response started before a committed deletion must not repopulate a cache. */
export async function readCurrentAccountData<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const before = generation;
    const result = await read();
    if (generation === before) return result;
  }
  throw new Error("Los datos cambiaron durante la consulta. Vuelve a actualizar.");
}
export const registerAccountCache = (clear: () => void) => { invalidators.add(clear); };
export function accountRevision() { try { return localStorage.getItem(KEY) ?? "0"; } catch { return "0"; } }

export function applyAccountDeletion(change: { revision: string; correos: string[] }, broadcast = true) {
  if (typeof window === "undefined" || !/^\d+$/.test(change.revision)) return;
  const emails = new Set(change.correos.map(email => email.trim().toLowerCase()));
  generation++;
  invalidators.forEach(clear => clear());
  try {
    // Clear derived data, retaining credentials only in the protected audit.
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i) ?? "");
    for (const key of keys) {
      if (/pantallas.*cache|cuentas.*cache|vencid|__plat_cache|__stamp_|__pw_queue_daily_v1|__usuarios_all_cache|__cc_inv_cache|__inventario_cache|__pantallas_sum/i.test(key)) localStorage.removeItem(key);
    }
    for (const key of ["__pw_history_v2", "__pw_resolved_expirations_v1"]) {
      const saved = JSON.parse(localStorage.getItem(key) ?? "{}");
      for (const email of Object.keys(saved)) if (emails.has(email.trim().toLowerCase())) delete saved[email];
      localStorage.setItem(key, JSON.stringify(saved));
    }
    if (BigInt(change.revision) > BigInt(accountRevision())) localStorage.setItem(KEY, change.revision);
    if (broadcast) localStorage.setItem(MESSAGE, JSON.stringify({ ...change, nonce: Date.now() }));
  } catch { /* Refresh still happens if storage is unavailable. */ }
  window.dispatchEvent(new Event("password-changes-updated"));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: change }));
}

export function subscribeAccountDeletion(refresh: (change: AccountDeletion) => void) {
  const listener = (event: Event) => refresh((event as CustomEvent<AccountDeletion>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function listenAccountDeletionStorage() {
  const handler = (event: StorageEvent) => {
    if (event.key !== MESSAGE || !event.newValue) return;
    try { applyAccountDeletion(JSON.parse(event.newValue), false); } catch { /* Invalid message. */ }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export async function deleteEmailsGlobally(correos: (string | null | undefined)[], motivo: string) {
  if (correos.some(email => !email?.trim())) throw new Error("No se pudo identificar el correo de todos los registros.");
  const emails = [...new Set(correos.map(email => email!.trim().toLowerCase()))];
  const response = await fetch("/api/account-deletions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correos: emails, motivo }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "No se pudo eliminar. No se guardó ningún cambio.");
  applyAccountDeletion(result);
  return result as { correos: string[]; revision: string };
}

export async function deleteExpiredAccounts(targets: { tipo: "pantalla" | "completa"; id: string }[], motivo: string, destino: "inventario" | "eliminar" | "registro" = "inventario", expected?: { correo: string; clave: string; plataformaId: number; confirmado: true }, bulkConfirmed?: true) {
  const response = await fetch("/api/cuentasvencidas/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets, motivo, destino, expected, bulkConfirmed }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "No se pudo completar la operación.");
  applyAccountDeletion(result);
  return result as { correos: string[]; revision: string; eliminated?: number; skipped?: { tipo: string; id: string; correo?: string; reason: string }[] };
}
