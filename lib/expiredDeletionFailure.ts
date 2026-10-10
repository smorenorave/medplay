import { Prisma } from "../src/generated/prisma";

// Only return canonical names already declared in our schema, never arbitrary
// metadata strings (which can contain database names or submitted values).
function missingSchemaField(meta: unknown): string | undefined {
  if (!meta || typeof meta !== "object") return;
  const data = meta as { modelName?: unknown; column?: unknown };
  if (typeof data.column !== "string") return;
  const parts = data.column.replace(/[`"']/g, "").split(".");
  const column = parts.at(-1);
  const modelName = parts.length > 1 ? parts.at(-2) : data.modelName;
  const model = Prisma.dmmf.datamodel.models.find(item => item.name === modelName || item.dbName === modelName);
  const field = model?.fields.find(item => item.kind !== "object" && (item.name === column || item.dbName === column));
  return model && field ? `${model.name}.${field.name}` : undefined;
}

/** Public diagnostics only: never return Prisma messages, SQL or submitted data. */
export function expiredDeletionFailure(error: unknown) {
  const reason = error as { code?: unknown; name?: unknown; message?: unknown; meta?: unknown } | null;
  const code = typeof reason?.code === "string" ? reason.code : "";
  const rollback = "No se guardó ningún cambio.";
  if (reason?.message === "unauthorized") return {
    status: 401, code: "ADMIN_NOT_FOUND",
    error: `No se pudo validar el administrador de la sesión. Vuelve a iniciar sesión. ${rollback}`,
  };
  const missingField = code === "P2022" ? missingSchemaField(reason?.meta) : undefined;
  if (code === "P2021" || code === "P2022") return {
    status: 503, code,
    error: `La base de datos no coincide con la versión instalada: ${missingField ? `falta la columna ${missingField}` : "falta una tabla o columna necesaria"}. Deben aplicarse las migraciones pendientes en el servidor. ${rollback} Código: ${code}.`,
  };
  if (code === "P2002") return {
    status: 409, code,
    error: `Una restricción de registros únicos impidió completar la eliminación. Debe revisarse el esquema y los índices de auditoría del servidor. ${rollback} Código: ${code}.`,
  };
  if (code === "P2003") return {
    status: 409, code,
    error: `La base de datos conserva una relación que impide eliminar el lote. ${rollback} Código: ${code}.`,
  };
  if (code === "P2028" || code === "P2034") return {
    status: 503, code,
    error: `La transacción no pudo completarse por tiempo de espera o conflicto con otra operación. Intenta nuevamente en unos segundos. ${rollback} Código: ${code}.`,
  };
  if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code)) return {
    status: 503, code,
    error: `No se pudo mantener la conexión con la base de datos. Intenta nuevamente cuando se restablezca el servicio. ${rollback} Código: ${code}.`,
  };
  if (reason?.name === "PrismaClientValidationError") return {
    status: 500, code: "PRISMA_VALIDATION",
    error: `El cliente de base de datos rechazó la operación. Debe revisarse la consulta y regenerarse Prisma si cambió el esquema. ${rollback} Código: PRISMA_VALIDATION.`,
  };
  return {
    status: 500, code: /^P\d{4}$/.test(code) ? code : "EXPIRED_DELETE_FAILED",
    error: `No se pudo completar la operación. ${rollback}`,
  };
}
