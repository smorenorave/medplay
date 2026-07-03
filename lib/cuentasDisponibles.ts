/* =========================================================================
 * Tipos de entrada
 * ========================================================================= */

/** Fuente de un correo disponible: cuenta compartida o inventario. */
export type EmailSource = "acct" | "inv";

/**
 * Plataforma, tal como la expone la API/hook `usePlataformas`.
 * Únicamente se usa `cantidad_pantallas` (regla de negocio #2).
 */
export interface PlataformaInput {
  id: number | string;
  cantidad_pantallas: number | string | null | undefined;
}

/**
 * Fila de "cuentas compartidas" para una plataforma.
 * Corresponde al shape devuelto por `/api/cuentascompartidas`.
 */
export interface CuentaCompartidaInput {
  id: number;
  correo: string | null | undefined;
  contrasena?: string | null;
  /** Opcional: si la API la incluye, se usa para filtrar defensivamente. */
  plataforma_id?: number | string | null;
}

/**
 * Fila de inventario para una plataforma.
 * Corresponde al shape devuelto por `/api/inventario`.
 */
export interface InventarioItemInput {
  id: number;
  correo: string | null | undefined;
  clave?: string | null;
  /** Opcional: si la API la incluye, se usa para filtrar defensivamente. */
  plataforma_id?: number | string | null;
}

/**
 * Fila de "pantallas" (registros de venta/asignación) usada para calcular
 * cuántos cupos están ocupados por correo y por cuenta.
 *
 * NOTA IMPORTANTE: el `FormPantallas.tsx` original no tipaba ni leía
 * `cuenta_caida` en absoluto, a pesar de consumir el mismo endpoint
 * `/api/pantallas` que sí la devuelve para PantallasViewer. Este campo debe
 * venir del backend igual que en PantallasViewer; si tu API no lo incluyera
 * en el payload que usa FormPantallas, no hay forma de inferirlo aquí y las
 * filas simplemente se tratarán como "no caídas" (cuenta_caida = false).
 */
export interface PantallaRowInput {
  id?: number | string | null;
  correo: string | null | undefined;
  cuenta_id?: number | string | null;
  plataforma_id?: number | string | null;
  cuenta_caida?: boolean | number | null;
}

/** Parámetros de entrada de la función pública principal. */
export interface BuildDisponibilidadCorreosParams {
  /** Plataforma para la que se calcula la disponibilidad. */
  plataformaId: number | string;
  /** Catálogo completo de plataformas (para resolver la capacidad). */
  plataformas: PlataformaInput[];
  /** Cuentas compartidas de la plataforma (ya filtradas por la API o no). */
  cuentasCompartidas: CuentaCompartidaInput[];
  /** Inventario de la plataforma (ya filtrado por la API o no). */
  inventario: InventarioItemInput[];
  /** Dataset de pantallas (puede ser global o ya filtrado por plataforma). */
  pantallas: PantallaRowInput[];
  /**
   * Id de una fila de `pantallas` a excluir del conteo de "usados".
   * Útil cuando PantallasViewer está editando un registro existente y no
   * quiere que ese registro descuente su propio cupo.
   */
  excludeRowId?: number | string | null;
}

/* =========================================================================
 * Tipos de salida
 * ========================================================================= */

/** Una opción de correo disponible para mostrar en un dropdown. */
export interface CorreoDisponibleOption {
  email: string;
  source: EmailSource;
  /** Id de la cuenta compartida asociada (solo aplica a source = "acct"). */
  cuentaId: number | null;
}

/** Resultado completo devuelto por `buildDisponibilidadCorreos`. */
export interface DisponibilidadCorreosResult {
  plataformaId: number;
  /** Capacidad máxima resuelta desde `cantidad_pantallas`, o null si no hay. */
  capacidad: number | null;

  /** Opciones con cupos > 0, ya ordenadas (regla #6) y sin correos caídos. */
  options: CorreoDisponibleOption[];
  /** Mismo orden que `options`, solo los correos (para dropdowns simples). */
  emails: string[];

  /** correo normalizado -> id de la cuenta compartida (el mayor id visto). */
  acctIdMap: Record<string, number>;
  /** correo normalizado -> contraseña de la cuenta compartida. */
  acctPassMap: Record<string, string | null>;
  /** correo normalizado -> id del registro de inventario. */
  invIdMap: Record<string, number>;
  /** correo normalizado -> clave del registro de inventario. */
  invPassMap: Record<string, string | null>;

  /**
   * Cupos libres por candidato, con clave `${plataformaId}::${source}::${email}`.
   * Incluye TODOS los candidatos no caídos (incluso con cupos <= 0), igual
   * que el `freeByEmail` original de FormPantallas.
   */
  freeByEmail: Record<string, number>;
  /** correo normalizado -> cantidad de registros (pantallas) usados. */
  emailCounts: Record<string, number>;

  /** correo normalizado -> pantallas usadas (antes de descontar capacidad). */
  usedByEmail: Record<string, number>;
  /** cuenta_id -> pantallas usadas (antes de descontar capacidad). */
  usedByCuenta: Record<number, number>;

  /** Correos marcados como "cuenta caída" en esta plataforma (nunca aparecen en `options`). */
  caidaEmails: string[];
}

/* =========================================================================
 * Helpers privados: normalización
 * ========================================================================= */

/** Normaliza un correo: recorta espacios y pasa a minúsculas. */
function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/** Convierte un valor arbitrario a número finito, o null si no es válido. */
function toFiniteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Compara dos ids de plataforma/entidad de forma laxa (string vs number). */
function sameId(a: unknown, b: unknown): boolean {
  const na = toFiniteNumberOrNull(a);
  const nb = toFiniteNumberOrNull(b);
  return na !== null && nb !== null && na === nb;
}

/** Interpreta el flag `cuenta_caida` viniendo como boolean, 0/1, o vacío. */
function isCuentaCaida(row: PantallaRowInput): boolean {
  return row.cuenta_caida === true || row.cuenta_caida === 1;
}

/* =========================================================================
 * Helpers privados: capacidad (regla de negocio #2)
 * ========================================================================= */

/**
 * Resuelve la capacidad máxima de una plataforma usando EXCLUSIVAMENTE
 * `cantidad_pantallas`. Devuelve null si la plataforma no existe o el
 * valor no es un número positivo (nunca se usa un número fijo por defecto).
 */
function resolveCapacidad(
  plataformaId: number,
  plataformas: PlataformaInput[],
): number | null {
  const plataforma = plataformas.find((p) => sameId(p.id, plataformaId));
  if (!plataforma) return null;

  const cap = toFiniteNumberOrNull(plataforma.cantidad_pantallas);
  return cap !== null && cap > 0 ? cap : null;
}

/* =========================================================================
 * Helpers privados: filtrado y conteo de pantallas usadas
 * ========================================================================= */

/**
 * Filtra el dataset de pantallas a las filas de la plataforma indicada,
 * excluyendo opcionalmente una fila puntual (edición en curso).
 *
 * El filtro por `plataforma_id` es defensivo: si el caller ya envió un
 * dataset pre-filtrado por la API (como hace FormPantallas), esto no
 * descarta nada porque todas las filas ya pertenecen a la plataforma.
 */
function filtrarPantallasDePlataforma(
  pantallas: PantallaRowInput[],
  plataformaId: number,
  excludeRowId?: number | string | null,
): PantallaRowInput[] {
  return pantallas.filter((row) => {
    if (row.plataforma_id != null && !sameId(row.plataforma_id, plataformaId)) {
      return false;
    }
    if (excludeRowId != null && row.id != null && sameId(row.id, excludeRowId)) {
      return false;
    }
    return true;
  });
}

/**
 * Construye el set de correos marcados como "cuenta caída" dentro de la
 * plataforma (regla #1). A diferencia del PantallasViewer original, este
 * cálculo está escopado por plataforma: un correo caído en la plataforma A
 * ya no se excluye erróneamente en la plataforma B.
 */
function construirCorreosCaidos(pantallasDePlataforma: PantallaRowInput[]): Set<string> {
  const set = new Set<string>();
  for (const row of pantallasDePlataforma) {
    if (!isCuentaCaida(row)) continue;
    const email = normalizeEmail(row.correo);
    if (email) set.add(email);
  }
  return set;
}

/** Resultado del conteo de pantallas usadas, agrupado por correo y por cuenta. */
interface ConteoPantallas {
  usedByEmail: Record<string, number>;
  usedByCuenta: Record<number, number>;
}

/**
 * Cuenta cuántas pantallas hay usadas por correo y por cuenta_id, sobre el
 * dataset ya filtrado a la plataforma correspondiente. Las filas con
 * `cuenta_caida = true` SÍ se cuentan aquí, porque ese cupo sigue ocupado
 * físicamente aunque el correo no se vuelva a ofrecer (ver nota de la regla #1
 * al inicio del archivo).
 */
function contarPantallasUsadas(pantallasDePlataforma: PantallaRowInput[]): ConteoPantallas {
  const usedByEmail: Record<string, number> = {};
  const usedByCuenta: Record<number, number> = {};

  for (const row of pantallasDePlataforma) {
    const email = normalizeEmail(row.correo);
    if (email) usedByEmail[email] = (usedByEmail[email] ?? 0) + 1;

    const cuentaId = toFiniteNumberOrNull(row.cuenta_id);
    if (cuentaId !== null && cuentaId > 0) {
      usedByCuenta[cuentaId] = (usedByCuenta[cuentaId] ?? 0) + 1;
    }
  }

  return { usedByEmail, usedByCuenta };
}

/* =========================================================================
 * Helpers privados: maps de cuentas compartidas e inventario
 * ========================================================================= */

/** Entrada interna de cuenta compartida agrupada por correo. */
interface AcctMapEntry {
  id: number;
  pass: string | null;
}

/**
 * Agrupa las cuentas compartidas por correo normalizado.
 *
 * Replica exactamente el comportamiento original de FormPantallas:
 *  - `id`  = el mayor id visto para ese correo.
 *  - `pass`= la contraseña de la ÚLTIMA fila iterada con ese correo (no
 *    necesariamente la fila del mayor id). Es una inconsistencia del
 *    código original que se preserva a propósito para no cambiar
 *    comportamiento; si se prefiere que `pass` acompañe siempre al id
 *    máximo, hay que decidirlo explícitamente y ajustar esta función.
 */
function construirMapaCuentas(
  cuentasCompartidas: CuentaCompartidaInput[],
  plataformaId: number,
): Map<string, AcctMapEntry> {
  const map = new Map<string, AcctMapEntry>();

  for (const row of cuentasCompartidas) {
    if (row.plataforma_id != null && !sameId(row.plataforma_id, plataformaId)) {
      continue;
    }
    const email = normalizeEmail(row.correo);
    if (!email) continue;

    const previous = map.get(email);
    map.set(email, {
      id: Math.max(previous?.id ?? 0, Number(row.id)),
      pass: row.contrasena ?? null,
    });
  }

  return map;
}

/** Entrada interna de inventario agrupada por correo. */
interface InvMapEntry {
  id: number | null;
  pass: string | null;
}

/**
 * Agrupa el inventario por correo normalizado. La última fila iterada con
 * un correo dado sobreescribe por completo (id y pass) a la anterior,
 * igual que en el código original.
 */
function construirMapaInventario(
  inventario: InventarioItemInput[],
  plataformaId: number,
): Map<string, InvMapEntry> {
  const map = new Map<string, InvMapEntry>();

  for (const row of inventario) {
    if (row.plataforma_id != null && !sameId(row.plataforma_id, plataformaId)) {
      continue;
    }
    const email = normalizeEmail(row.correo);
    if (!email) continue;

    map.set(email, {
      id: row.id != null ? Number(row.id) : null,
      pass: row.clave ?? null,
    });
  }

  return map;
}

/* =========================================================================
 * Helpers privados: candidatos, cupos, filtrado y orden
 * ========================================================================= */

/**
 * Construye la lista de candidatos a partir de los maps de cuentas e
 * inventario, excluyendo por completo los correos caídos (regla #1: "nunca
 * debe aparecer"). Las cuentas compartidas tienen prioridad: si un correo
 * existe en ambas fuentes, solo se genera el candidato "acct" (igual que en
 * el código original de FormPantallas).
 */
function construirCandidatos(
  acctMap: Map<string, AcctMapEntry>,
  invMap: Map<string, InvMapEntry>,
  correosCaidos: Set<string>,
): CorreoDisponibleOption[] {
  const seen = new Set<string>();
  const candidatos: CorreoDisponibleOption[] = [];

  for (const [email, entry] of acctMap) {
    if (correosCaidos.has(email) || seen.has(email)) continue;
    seen.add(email);
    candidatos.push({ email, source: "acct", cuentaId: entry.id ?? null });
  }

  for (const email of invMap.keys()) {
    if (correosCaidos.has(email) || seen.has(email)) continue;
    seen.add(email);
    candidatos.push({ email, source: "inv", cuentaId: null });
  }

  return candidatos;
}

/**
 * Calcula los cupos libres de cada candidato (regla #3: capacidad - usados).
 * Para candidatos "acct" con `cuentaId`, los usados se toman por cuenta_id
 * (agrupa correctamente aunque el correo de la cuenta haya cambiado); para
 * el resto, se toman por correo.
 *
 * Devuelve un map con TODOS los candidatos (incluso con cupos <= 0), con
 * clave `${plataformaId}::${source}::${email}`, igual que el `freeByEmail`
 * original.
 */
function calcularCupos(
  candidatos: CorreoDisponibleOption[],
  plataformaId: number,
  capacidad: number,
  conteo: ConteoPantallas,
): Record<string, number> {
  const freeByEmail: Record<string, number> = {};

  for (const candidato of candidatos) {
    const usados =
      candidato.source === "acct" && candidato.cuentaId
        ? (conteo.usedByCuenta[candidato.cuentaId] ?? 0)
        : (conteo.usedByEmail[candidato.email] ?? 0);

    const key = `${plataformaId}::${candidato.source}::${candidato.email}`;
    freeByEmail[key] = Math.max(0, capacidad - usados);
  }

  return freeByEmail;
}

/**
 * Filtra los candidatos a solo aquellos con cupos > 0 (regla #4: "si cupos
 * <= 0, no mostrar el correo").
 */
function filtrarConCupos(
  candidatos: CorreoDisponibleOption[],
  plataformaId: number,
  freeByEmail: Record<string, number>,
): CorreoDisponibleOption[] {
  return candidatos.filter((candidato) => {
    const key = `${plataformaId}::${candidato.source}::${candidato.email}`;
    const free = freeByEmail[key];
    return typeof free === "number" && free > 0;
  });
}

/**
 * Ordena las opciones finales (regla #6): primero las cuentas compartidas
 * ("acct"), luego el inventario ("inv"); dentro de cada grupo, orden
 * alfabético por correo. Este es el único criterio de orden válido para
 * ambos componentes.
 */
function ordenarOpciones(
  options: CorreoDisponibleOption[],
): CorreoDisponibleOption[] {
  return [...options].sort((a, b) => {
    if (a.source !== b.source) return a.source === "acct" ? -1 : 1;
    return a.email.localeCompare(b.email);
  });
}

/* =========================================================================
 * Helpers privados: construcción de los maps de salida
 * ========================================================================= */

/** Construye `acctIdMap` / `acctPassMap` a partir del map interno de cuentas. */
function construirAcctMapsDeSalida(acctMap: Map<string, AcctMapEntry>): {
  acctIdMap: Record<string, number>;
  acctPassMap: Record<string, string | null>;
} {
  const acctIdMap: Record<string, number> = {};
  const acctPassMap: Record<string, string | null> = {};

  for (const [email, entry] of acctMap) {
    acctIdMap[email] = entry.id;
    acctPassMap[email] = entry.pass ?? null;
  }

  return { acctIdMap, acctPassMap };
}

/** Construye `invIdMap` / `invPassMap` a partir del map interno de inventario. */
function construirInvMapsDeSalida(invMap: Map<string, InvMapEntry>): {
  invIdMap: Record<string, number>;
  invPassMap: Record<string, string | null>;
} {
  const invIdMap: Record<string, number> = {};
  const invPassMap: Record<string, string | null> = {};

  for (const [email, entry] of invMap) {
    invPassMap[email] = entry.pass ?? null;
    if (entry.id != null) invIdMap[email] = entry.id;
  }

  return { invIdMap, invPassMap };
}

/**
 * Construye `emailCounts` (cantidad de registros/pantallas por correo, para
 * el badge "hay N registros"), limitado a los correos candidatos (igual que
 * el original: solo se calcula para correos que son opción de cuenta o
 * inventario, no para cualquier correo del dataset de pantallas).
 */
function construirEmailCounts(
  candidatos: CorreoDisponibleOption[],
  usedByEmail: Record<string, number>,
): Record<string, number> {
  const emailCounts: Record<string, number> = {};
  for (const candidato of candidatos) {
    if (emailCounts[candidato.email] == null) {
      emailCounts[candidato.email] = usedByEmail[candidato.email] ?? 0;
    }
  }
  return emailCounts;
}

/* =========================================================================
 * Función pública principal
 * ========================================================================= */

/**
 * Calcula toda la disponibilidad de correos (cuentas compartidas +
 * inventario) para una plataforma dada, aplicando las reglas de negocio
 * documentadas al inicio del archivo. Es la única fuente de verdad que
 * deben consumir tanto FormPantallas como PantallasViewer.
 *
 * No hace fetch ni tiene efectos secundarios: recibe los datos ya cargados
 * y devuelve estructuras planas, listas para pintar en un dropdown o para
 * usarse en badges de "cupos"/"registros".
 */
export function buildDisponibilidadCorreos(
  params: BuildDisponibilidadCorreosParams,
): DisponibilidadCorreosResult {
  const plataformaId = Number(params.plataformaId);

  const pantallasDePlataforma = filtrarPantallasDePlataforma(
    params.pantallas,
    plataformaId,
    params.excludeRowId,
  );

  const correosCaidos = construirCorreosCaidos(pantallasDePlataforma);
  const conteo = contarPantallasUsadas(pantallasDePlataforma);

  const acctMap = construirMapaCuentas(params.cuentasCompartidas, plataformaId);
  const invMap = construirMapaInventario(params.inventario, plataformaId);

  const { acctIdMap, acctPassMap } = construirAcctMapsDeSalida(acctMap);
  const { invIdMap, invPassMap } = construirInvMapsDeSalida(invMap);

  const capacidad = resolveCapacidad(plataformaId, params.plataformas);

  // Sin capacidad válida no hay cupos que ofrecer, pero los maps de
  // cuentas/inventario se devuelven igual (igual que el branch original de
  // FormPantallas cuando `cap <= 0`).
  if (capacidad === null) {
    return {
      plataformaId,
      capacidad: null,
      options: [],
      emails: [],
      acctIdMap,
      acctPassMap,
      invIdMap,
      invPassMap,
      freeByEmail: {},
      emailCounts: {},
      usedByEmail: conteo.usedByEmail,
      usedByCuenta: conteo.usedByCuenta,
      caidaEmails: Array.from(correosCaidos),
    };
  }

  const candidatos = construirCandidatos(acctMap, invMap, correosCaidos);
  const freeByEmail = calcularCupos(candidatos, plataformaId, capacidad, conteo);
  const emailCounts = construirEmailCounts(candidatos, conteo.usedByEmail);

  const conCupos = filtrarConCupos(candidatos, plataformaId, freeByEmail);
  const options = ordenarOpciones(conCupos);
  const emails = options.map((o) => o.email);

  return {
    plataformaId,
    capacidad,
    options,
    emails,
    acctIdMap,
    acctPassMap,
    invIdMap,
    invPassMap,
    freeByEmail,
    emailCounts,
    usedByEmail: conteo.usedByEmail,
    usedByCuenta: conteo.usedByCuenta,
    caidaEmails: Array.from(correosCaidos),
  };
}