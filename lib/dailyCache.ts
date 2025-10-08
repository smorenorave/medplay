// Cache diario súper simple en localStorage (lado cliente).
// Guarda datos etiquetados por la fecha local (YYYY-MM-DD).
// Útil para vistas que se “actualizan una vez al día” (vencidas, reportes, etc).

export type DailyCache<T> = {
  date: string;   // YYYY-MM-DD (local)
  ts: number;     // timestamp guardado
  data: T;
};

const hasWindow = () => typeof window !== 'undefined';
const pad2 = (n: number) => String(n).padStart(2, '0');

export function todayYMDLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

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
