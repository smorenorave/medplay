export type DataUpdateMessageInput = {
  correo?: string | null;
  contrasena?: string | null;
  fechaVencimiento?: string | null;
  servicio?: string | null;
  numeroPantalla?: string | number | null;
  pin?: string | null;
  tipo: "cuenta" | "pantalla";
};

const valueOrFallback = (
  value: string | number | null | undefined,
  fallback: string,
) => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

/**
 * Construye el mensaje que se envía al cliente después de actualizar su
 * servicio. El número de pantalla solo pertenece a ventas individuales.
 */
export function buildDataUpdateMessage(input: DataUpdateMessageInput): string {
  const lines = [
    "ACTUALIZACIÓN DE DATOS",
    `📧 Correo: ${valueOrFallback(input.correo, "No registrado")}`,
    `🔑 Clave: ${valueOrFallback(input.contrasena, "No registrada")}`,
    `📅 Fecha de vencimiento: ${valueOrFallback(input.fechaVencimiento, "No registrada")}`,
    `📦 Servicio: ${valueOrFallback(input.servicio, "No registrado")}`,
  ];

  if (input.tipo === "pantalla") {
    lines.push(
      `🖥️ Número de pantalla: ${valueOrFallback(input.numeroPantalla, "No registrado")}`,
    );
    if (input.pin?.trim()) lines.push(`PIN: ${input.pin.trim()}`);
  }

  return lines.join("\n");
}
