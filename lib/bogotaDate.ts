const BOGOTA_TIME_ZONE = "America/Bogota";

const formatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: BOGOTA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayYMDBogota(date = new Date()): string {
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function utcDateFromYMD(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysYMD(ymd: string, days: number): string {
  const date = utcDateFromYMD(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function monthStartYMDBogota(date = new Date()): string {
  return `${todayYMDBogota(date).slice(0, 7)}-01`;
}

export function isAfterTodayBogota(ymd: string | null | undefined, date = new Date()): boolean {
  return Boolean(ymd && ymd.slice(0, 10) > todayYMDBogota(date));
}

/** Civil dates use UTC only as an arithmetic carrier, never as a local instant. */
export function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function formatDateCO(value?: string | null): string {
  const ymd = value?.slice(0, 10) ?? "";
  if (!isCivilDate(ymd)) return value ? "—" : "";
  return ymd.slice(8, 10) + "/" + ymd.slice(5, 7) + "/" + ymd.slice(0, 4);
}
export function parseDateCO(value: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!m) return "";
  const ymd = m[3] + "-" + m[2] + "-" + m[1];
  return isCivilDate(ymd) ? ymd : "";
}
export function addMonthsYMD(ymd: string, months: number): string {
  if (!isCivilDate(ymd) || !Number.isFinite(months)) return "";
  const date = utcDateFromYMD(ymd);
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  if (date.getUTCDate() !== day) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}
