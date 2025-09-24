// lib/dates.ts
/** hoy local → YYYY-MM-DD */
export function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** mismo día del próximo mes (si no existe, clampa al último día) */
export function nextMonthStr() {
  const base = new Date();
  const day = base.getDate();
  const d = new Date(base);
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() < day) d.setDate(0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
