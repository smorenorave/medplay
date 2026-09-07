const BOGOTA_TIME_ZONE = "America/Bogota";

const formatter = new Intl.DateTimeFormat("en-CA", {
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
