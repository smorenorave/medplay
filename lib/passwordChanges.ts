import { getDaily, todayYMDLocal } from "./dailyCache";

export type PasswordChange = { pw: string; plataforma_id?: number };
export type PasswordChanges = Record<string, PasswordChange>;
export const PASSWORD_CHANGES_KEY = "__pw_history_v2";
export const PASSWORD_CHANGES_EVENT = "password-changes-updated";
const RESOLVED_KEY = "__pw_resolved_expirations_v1";
const normalize = (email: string) => email.trim().toLowerCase();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}

export function readPasswordChanges(): PasswordChanges {
  // Preserve the existing daily list when first opening the updated application.
  const saved = read<PasswordChanges | null>(PASSWORD_CHANGES_KEY, null);
  if (saved) return saved;
  const legacy = getDaily<PasswordChanges>("__pw_queue_daily_v1") ?? {};
  if (typeof window !== "undefined") localStorage.setItem(PASSWORD_CHANGES_KEY, JSON.stringify(legacy));
  return legacy;
}

export function writePasswordChanges(changes: PasswordChanges) {
  localStorage.setItem(PASSWORD_CHANGES_KEY, JSON.stringify(changes));
  window.dispatchEvent(new Event(PASSWORD_CHANGES_EVENT));
}

export function recordPasswordChange(email: string, pw: string, plataforma_id?: number) {
  const correo = normalize(email);
  if (!correo) return;
  // Independent from history: deleting its entry must not reopen expired rows.
  const resolved = read<Record<string, string>>(RESOLVED_KEY, {});
  const tomorrow = new Date(`${todayYMDLocal()}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const through = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  localStorage.setItem(RESOLVED_KEY, JSON.stringify({ ...resolved, [correo]: through }));
  writePasswordChanges({ ...readPasswordChanges(), [correo]: { pw, plataforma_id } });
}

export function readResolvedExpirations() {
  return read<Record<string, string>>(RESOLVED_KEY, {});
}

export function isResolvedExpiration(email: string | null, expiration: string, resolved = readResolvedExpirations()) {
  const through = resolved[normalize(email ?? "")];
  return !!through && expiration <= through;
}

export function deletePasswordChange(email: string) {
  const next = { ...readPasswordChanges() };
  delete next[email];
  writePasswordChanges(next);
}
