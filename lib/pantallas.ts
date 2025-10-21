export async function fetchPantallasCountByCuentaId(cuentaId: number) {
  const res = await fetch(
    `/api/pantallas?cuenta_id=${cuentaId}&limit=10000`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("No se pudo obtener conteo de pantallas");

  const j = await res.json();

  // Soporta varias formas comunes de respuesta
  if (Array.isArray(j)) return j.length;
  if (Array.isArray(j?.items)) return j.items.length;
  if (Array.isArray(j?.data)) return j.data.length;

  const n =
    Number(j?.total) ??
    Number(j?.count) ??
    Number(j?.pagination?.total) ??
    0;

  return Number.isFinite(n) ? n : 0;
}
