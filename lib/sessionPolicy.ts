export const INACTIVITY_MS = 60 * 60 * 1000;
export function isSessionInactive(raw: string | undefined, now = Date.now()) {
  const last = Number(raw);
  return !Number.isFinite(last) || last <= 0 || last > now || now - last >= INACTIVITY_MS;
}
