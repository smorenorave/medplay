import { addDaysYMD, isCivilDate, todayYMDBogota } from "./bogotaDate";

export type ExpirationBucket = "anteriores" | "hoy" | "manana" | "proximos";
export function expirationBucket(value: string | null | undefined, today = todayYMDBogota()): ExpirationBucket | null {
  if (!value || !isCivilDate(value)) return null;
  return value < today ? "anteriores" : value === today ? "hoy" : value === addDaysYMD(today, 1) ? "manana" : "proximos";
}
