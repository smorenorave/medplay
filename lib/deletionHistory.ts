import type { Prisma } from "@generated/prisma";

export type DeletedAccountInput = {
  plataformaId?: number | null;
  plataforma?: string | null;
  correo?: string | null;
  clave?: string | null;
  proveedor?: string | null;
  tipoRegistro: "CUENTA_COMPLETA" | "CUENTA_COMPARTIDA" | "PANTALLA" | "INVENTARIO";
  tipoEliminacion: string;
  identificadorOriginal?: string | number | bigint | null;
  eliminadoPorAdminId?: number | null;
  datosRecuperacion?: Prisma.InputJsonValue;
};

const clean = (value?: string | null) => String(value ?? "").trim();

/**
 * Conserva una sola copia recuperable por plataforma + correo.
 * Si vuelve a eliminarse, actualiza los datos más recientes y aumenta el contador.
 */
export async function archiveDeletedAccount(
  tx: Prisma.TransactionClient,
  input: DeletedAccountInput,
) {
  const correo = clean(input.correo).toLowerCase();
  if (!correo) return null;

  const plataforma = clean(input.plataforma) || "Sin plataforma";
  const platformKey = input.plataformaId != null
    ? `id:${input.plataformaId}`
    : `nombre:${plataforma.toLocaleLowerCase("es")}`;
  const dedupeKey = `${platformKey}|${correo}`;
  const now = new Date();

  return tx.deletedAccountHistory.upsert({
    where: { dedupeKey },
    create: {
      dedupeKey,
      plataformaId: input.plataformaId ?? null,
      plataforma,
      correo,
      clave: input.clave ?? null,
      proveedor: input.proveedor ?? null,
      tipoRegistro: input.tipoRegistro,
      tipoEliminacion: input.tipoEliminacion,
      identificadorOriginal: input.identificadorOriginal == null
        ? null
        : String(input.identificadorOriginal),
      eliminadoPorAdminId: input.eliminadoPorAdminId ?? null,
      datosRecuperacion: input.datosRecuperacion,
      primeraEliminacion: now,
      ultimaEliminacion: now,
    },
    update: {
      plataformaId: input.plataformaId ?? null,
      plataforma,
      clave: input.clave ?? null,
      proveedor: input.proveedor ?? null,
      tipoRegistro: input.tipoRegistro,
      tipoEliminacion: input.tipoEliminacion,
      identificadorOriginal: input.identificadorOriginal == null
        ? null
        : String(input.identificadorOriginal),
      eliminadoPorAdminId: input.eliminadoPorAdminId ?? null,
      datosRecuperacion: input.datosRecuperacion,
      cantidadEliminaciones: { increment: 1 },
      ultimaEliminacion: now,
    },
  });
}
