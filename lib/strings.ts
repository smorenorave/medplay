/** Quita TODOS los espacios (útil para comparar contactos) */
export function normalizeContacto(s: string) {
  return (s ?? '').trim().replace(/\s+/g, '');
}

/** Conserva la mascara numerica historica y permite usernames sin espacios. */
export function formatContactoInput(value: string) {
  const raw = value ?? '';

  if (/[A-Za-z]/.test(raw)) {
    return raw.replace(/\s+/g, '');
  }

  const soloDigitos = raw
    .replace(/[^\d\s]/g, '')
    .replace(/^\s+/, '');

  return soloDigitos ? `+${soloDigitos}` : '';
}

export function isContactoUsername(value: string) {
  return /[A-Za-z]/.test(value ?? '');
}

export const lowNoAccents = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
