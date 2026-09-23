import type { Prisma } from "@generated/prisma";

export const normalizeCredentialEmail = (value?: string | null) =>
  String(value ?? "").trim().toLowerCase();

export const normalizeCredentialPassword = (value?: string | null) =>
  value == null ? "" : String(value);

export type CredentialSource =
  | "cuentascompartidas"
  | "cuentascompletas"
  | "inventario";

export async function findCredentialByPlatformEmail(
  tx: Prisma.TransactionClient,
  plataformaId: number,
  correoRaw: string,
) {
  const correo = normalizeCredentialEmail(correoRaw);
  if (!correo || !Number.isInteger(plataformaId) || plataformaId <= 0) {
    return null;
  }

  const [shared, complete, inventory] = await Promise.all([
    tx.cuentascompartidas.findFirst({
      where: { plataforma_id: plataformaId, correo },
      orderBy: { id: "desc" },
      select: { contrasena: true },
    }),
    tx.cuentascompletas.findFirst({
      where: { plataforma_id: plataformaId, correo },
      orderBy: { updatedAt: "desc" },
      select: { contrasena: true },
    }),
    tx.inventario.findFirst({
      where: { plataforma_id: plataformaId, correo },
      orderBy: { id: "desc" },
      select: { clave: true },
    }),
  ]);

  const candidates: Array<{
    source: CredentialSource;
    password: string | null | undefined;
  }> = [
    { source: "cuentascompartidas", password: shared?.contrasena },
    { source: "cuentascompletas", password: complete?.contrasena },
    { source: "inventario", password: inventory?.clave },
  ];

  const credential =
    candidates.find(({ password }) => password != null && password !== "") ??
    candidates.find(({ password }) => password != null);

  return credential
    ? {
        correo,
        plataformaId,
        contrasena: normalizeCredentialPassword(credential.password),
        source: credential.source,
      }
    : null;
}

export async function syncCredentialByPlatformEmail(
  tx: Prisma.TransactionClient,
  input: {
    plataformaId: number;
    correo: string;
    contrasena: string | null;
  },
) {
  const correo = normalizeCredentialEmail(input.correo);
  const contrasena = normalizeCredentialPassword(input.contrasena);

  if (!correo || !Number.isInteger(input.plataformaId) || input.plataformaId <= 0) {
    throw new Error("invalid-credential-scope");
  }

  const [shared, complete, inventory] = await Promise.all([
    tx.cuentascompartidas.updateMany({
      where: { plataforma_id: input.plataformaId, correo },
      data: { contrasena },
    }),
    tx.cuentascompletas.updateMany({
      where: { plataforma_id: input.plataformaId, correo },
      data: { contrasena },
    }),
    tx.inventario.updateMany({
      where: { plataforma_id: input.plataformaId, correo },
      data: { clave: contrasena },
    }),
  ]);

  return {
    correo,
    plataformaId: input.plataformaId,
    updated: {
      cuentasCompartidas: shared.count,
      cuentasCompletas: complete.count,
      inventario: inventory.count,
    },
  };
}
