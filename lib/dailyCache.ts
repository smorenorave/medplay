import { todayYMDBogota } from "./bogotaDate";
// Cache diario súper simple en localStorage (lado cliente).
// Guarda datos etiquetados por la fecha de Colombia (YYYY-MM-DD).
// Útil para vistas que se “actualizan una vez al día” (vencidas, reportes, etc).

export type DailyCache<T> = {
  date: string;   // YYYY-MM-DD (local)
  ts: number;     // timestamp guardado
  data: T;
};

const hasWindow = () => typeof window !== 'undefined';

export function todayYMDLocal(): string { return todayYMDBogota(); }

export function getDaily<T = any>(key: string): T | null {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw) as DailyCache<T>;
    if (!obj?.date) return null;
    return obj.date === todayYMDLocal() ? (obj.data as T) : null;
  } catch {
    return null;
  }
}

export function setDaily<T = any>(key: string, data: T): void {
  if (!hasWindow()) return;
  try {
    const payload: DailyCache<T> = {
      date: todayYMDLocal(),
      ts: Date.now(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

export function clearDaily(key: string): void {
  if (!hasWindow()) return;
  try { localStorage.removeItem(key); } catch {}
}
