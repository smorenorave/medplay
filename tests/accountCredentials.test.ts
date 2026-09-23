import test from "node:test";
import assert from "node:assert/strict";
import {
  findCredentialByPlatformEmail,
  normalizeCredentialEmail,
  syncCredentialByPlatformEmail,
} from "../lib/accountCredentials";

test("normaliza el correo sin cambiar la contraseña", () => {
  assert.equal(normalizeCredentialEmail(" Cuenta@Gmail.COM "), "cuenta@gmail.com");
});

test("busca la clave usando exactamente plataforma y correo", async () => {
  const seen: Array<{ table: string; where: unknown }> = [];
  const tx = {
    cuentascompartidas: {
      findFirst: async ({ where }: any) => {
        seen.push({ table: "cuentascompartidas", where });
        return { contrasena: "clave-compartida" };
      },
    },
    cuentascompletas: {
      findFirst: async ({ where }: any) => {
        seen.push({ table: "cuentascompletas", where });
        return { contrasena: "clave-completa" };
      },
    },
    inventario: {
      findFirst: async ({ where }: any) => {
        seen.push({ table: "inventario", where });
        return { clave: "clave-inventario" };
      },
    },
  } as any;

  const result = await findCredentialByPlatformEmail(
    tx,
    7,
    " Cuenta@Gmail.com ",
  );

  assert.equal(result?.contrasena, "clave-compartida");
  assert.deepEqual(
    seen.map(({ where }) => where),
    Array(3).fill({ plataforma_id: 7, correo: "cuenta@gmail.com" }),
  );
});

test("sincroniza todas las fuentes sin salir de plataforma + correo", async () => {
  const updates: Array<{ table: string; args: any }> = [];
  const updateMany = (table: string) => async (args: any) => {
    updates.push({ table, args });
    return { count: 1 };
  };
  const tx = {
    cuentascompartidas: { updateMany: updateMany("cuentascompartidas") },
    cuentascompletas: { updateMany: updateMany("cuentascompletas") },
    inventario: { updateMany: updateMany("inventario") },
  } as any;

  const result = await syncCredentialByPlatformEmail(tx, {
    plataformaId: 9,
    correo: " CUENTA@gmail.com ",
    contrasena: "98765",
  });

  assert.equal(updates.length, 3);
  for (const update of updates) {
    assert.deepEqual(update.args.where, {
      plataforma_id: 9,
      correo: "cuenta@gmail.com",
    });
    assert.deepEqual(update.args.data, {
      ...(update.table === "inventario"
        ? { clave: "98765" }
        : { contrasena: "98765" }),
    });
  }
  assert.deepEqual(result.updated, {
    cuentasCompartidas: 1,
    cuentasCompletas: 1,
    inventario: 1,
  });
});

test("rechaza un alcance sin plataforma o correo válido", async () => {
  await assert.rejects(
    syncCredentialByPlatformEmail({} as any, {
      plataformaId: 0,
      correo: "",
      contrasena: "clave",
    }),
    /invalid-credential-scope/,
  );
});

test("conserva otra plataforma y devuelve la clave nueva al reabrir", async () => {
  type Row = {
    plataforma_id: number;
    correo: string;
    contrasena?: string;
    clave?: string;
  };
  const shared: Row[] = [
    { plataforma_id: 9, correo: "cuenta@gmail.com", contrasena: "12345" },
    { plataforma_id: 10, correo: "cuenta@gmail.com", contrasena: "netflix" },
  ];
  const complete: Row[] = [
    { plataforma_id: 9, correo: "cuenta@gmail.com", contrasena: "12345" },
  ];
  const inventory: Row[] = [
    { plataforma_id: 9, correo: "cuenta@gmail.com", clave: "12345" },
  ];

  const table = (rows: Row[], passwordField: "contrasena" | "clave") => ({
    findFirst: async ({ where }: any) => {
      const row = rows.find(
        (item) =>
          item.plataforma_id === where.plataforma_id &&
          item.correo === where.correo,
      );
      return row ? { [passwordField]: row[passwordField] } : null;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const row of rows) {
        if (
          row.plataforma_id === where.plataforma_id &&
          row.correo === where.correo
        ) {
          row[passwordField] = data[passwordField];
          count += 1;
        }
      }
      return { count };
    },
  });
  const tx = {
    cuentascompartidas: table(shared, "contrasena"),
    cuentascompletas: table(complete, "contrasena"),
    inventario: table(inventory, "clave"),
  } as any;

  await syncCredentialByPlatformEmail(tx, {
    plataformaId: 9,
    correo: "cuenta@gmail.com",
    contrasena: "98765",
  });
  const reopened = await findCredentialByPlatformEmail(
    tx,
    9,
    "cuenta@gmail.com",
  );

  assert.equal(reopened?.contrasena, "98765");
  assert.equal(shared[1].contrasena, "netflix");
});
