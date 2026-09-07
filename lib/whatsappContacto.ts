export type WhatsAppContacto =
  | { tipo: "numero"; valor: string }
  | { tipo: "username"; valor: string };

const E164 = /^\d{8,15}$/;

/**
 * Conserva exactamente la normalizacion historica de telefonos: elimina
 * cualquier caracter que no sea un digito. Un valor con letras se considera
 * username para evitar convertir, por ejemplo, `medplay57` en el telefono 57.
 */
export function parseWhatsAppContacto(raw: string): WhatsAppContacto | null {
  const contacto = String(raw ?? "").trim();
  if (!contacto) return null;

  if (!/[A-Za-z]/.test(contacto)) {
    const numero = contacto.replace(/\D/g, "");
    return E164.test(numero) ? { tipo: "numero", valor: numero } : null;
  }

  const username = contacto.replace(/^@/, "");
  if (!username || /\s/.test(username)) return null;
  return { tipo: "username", valor: username };
}

export function buildWhatsAppLink(raw: string, mensaje?: string): string | null {
  const contacto = parseWhatsAppContacto(raw);
  if (!contacto) return null;

  const base = `https://wa.me/${encodeURIComponent(contacto.valor)}`;
  return mensaje === undefined ? base : `${base}?text=${encodeURIComponent(mensaje)}`;
}
