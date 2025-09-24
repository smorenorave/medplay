/* ===== Helpers locales para conteos de pantallas ===== */
export async  function fetchPantallasCountByCuentaId(cuentaId: number) {
  const res = await fetch(`/api/pantallas?cuenta_id=${cuentaId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo obtener conteo de pantallas');
  const rows = await res.json();
  // Si el endpoint devuelve filas filtradas por cuenta_id, .length es suficiente.
  // Si no, filtramos por si acaso.
  if (Array.isArray(rows)) {
    return rows.filter((r: any) => Number(r?.cuenta_id) === Number(cuentaId)).length;
  }
  // Si el endpoint devuelve {count: n}
  const n = Number(rows?.count ?? 0);
  return Number.isFinite(n) ? n : 0;
}