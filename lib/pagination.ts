/** Missing/invalid limits use the documented default; never coerce null to 0. */
export function pageLimit(raw: string | null, fallback: number, max = 5000): number {
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(1, Math.min(max, Math.floor(value))) : fallback;
}
