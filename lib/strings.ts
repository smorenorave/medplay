/** Quita TODOS los espacios (útil para comparar contactos) */
export function normalizeContacto(s: string) {
  return (s ?? '').trim().replace(/\s+/g, '');
}

export const lowNoAccents = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();