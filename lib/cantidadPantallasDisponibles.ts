
export interface PlataformaCapacidadInput {
  id: number | string;
  cantidad_pantallas: number | string | null | undefined;
}

/**
 * Fila de "pantallas" mínima necesaria para los cálculos de este archivo.
 * Estructuralmente compatible con `PantallaRowInput` de cuentasDisponibles.ts,
 * con el agregado de `nro_pantalla` (necesario para el picker de números).
 */
export interface PantallaUsoInput {
  id?: number | string | null;
  correo: string | null | undefined;
  cuenta_id?: number | string | null;
  plataforma_id?: number | string | null;
  nro_pantalla?: string | number | null | undefined;
}

/* =========================================================================
 * Helpers privados: normalización (duplicados intencionalmente triviales;
 * se mantienen privados a este archivo para no crear un acoplamiento
 * circular con cuentasDisponibles.ts, que es quien depende de este módulo
 * y no al revés).
 * ========================================================================= */

function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

function toFiniteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function sameId(a: unknown, b: unknown): boolean {
  const na = toFiniteNumberOrNull(a);
  const nb = toFiniteNumberOrNull(b);
  return na !== null && nb !== null && na === nb;
}

/* =========================================================================
 * Capacidad por plataforma (fuente única de verdad)
 * ========================================================================= */

/**
 * Resuelve la capacidad máxima de pantallas de una plataforma usando
 * EXCLUSIVAMENTE `cantidad_pantallas`. Devuelve `null` si la plataforma no
 * existe o el valor no es un número positivo (nunca hay un default fijo).
 *
 * Esta es la ÚNICA función de capacidad del proyecto: reemplaza a
 * `resolveMaxPantallas` / `capacityForPlatform` (FormPantallas) y a
 * `capacityByPlatform` (PantallasViewer). `cuentasDisponibles.ts` también
 * debe delegar aquí para su regla de negocio #2.
 */
export function resolveCapacidadPantallas(
  plataformaId: number | string,
  plataformas: PlataformaCapacidadInput[],
): number | null {
  const pid = toFiniteNumberOrNull(plataformaId);
  if (pid === null) return null;

  const plataforma = plataformas.find((p) => sameId(p.id, pid));
  if (!plataforma) return null;

  const cap = toFiniteNumberOrNull(plataforma.cantidad_pantallas);
  return cap !== null && cap > 0 ? cap : null;
}

/* =========================================================================
 * Filtrado por plataforma (compartido)
 * ========================================================================= */

/**
 * Filtra un dataset de pantallas a las filas de una plataforma dada,
 * excluyendo opcionalmente una fila puntual (edición en curso).
 *
 * El filtro por `plataforma_id` es defensivo: si el caller ya envió un
 * dataset pre-filtrado por la API, esto no descarta nada porque todas las
 * filas ya pertenecen a la plataforma.
 */
export function filtrarPantallasDePlataforma<T extends PantallaUsoInput>(
  pantallas: T[],
  plataformaId: number | string,
  excludeRowId?: number | string | null,
): T[] {
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

/* =========================================================================
 * Conteo de pantallas usadas (por correo y por cuenta)
 * ========================================================================= */

/** Resultado del conteo de pantallas usadas, agrupado por correo y por cuenta. */
export interface UsedCountsResult {
  /** correo normalizado -> cantidad de pantallas usadas. */
  usedByEmail: Record<string, number>;
  /** cuenta_id -> cantidad de pantallas usadas. */
  usedByCuenta: Record<number, number>;
}

/**
 * Cuenta cuántas pantallas hay usadas por correo y por cuenta_id, dentro de
 * una plataforma dada. Las filas con `cuenta_caida = true` SÍ se cuentan
 * (ese cupo sigue ocupado físicamente aunque el correo no se vuelva a
 * ofrecer), igual que en `cuentasDisponibles.ts`.
 *
 * Es la ÚNICA función de conteo de usados del proyecto: reemplaza tanto a
 * la lógica privada de `cuentasDisponibles.ts` como al `usedByEmailPlat`
 * escopado-a-todo-el-dataset de PantallasViewer cuando lo que se necesita
 * es el conteo de UNA plataforma puntual.
 */
export function computeUsedCounts(
  pantallas: PantallaUsoInput[],
  plataformaId: number | string,
  excludeRowId?: number | string | null,
): UsedCountsResult {
  const pantallasDePlataforma = filtrarPantallasDePlataforma(
    pantallas,
    plataformaId,
    excludeRowId,
  );

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
 * Conteo global por (plataforma + correo), para listados como PantallasViewer
 * ========================================================================= */

/** Construye la clave usada por `computeUsedByEmailPlatform`. */
export function buildPidEmailKey(
  plataformaId: number | string | null | undefined,
  correo: string | null | undefined,
): string {
  const pid = toFiniteNumberOrNull(plataformaId);
  return `${pid ?? "null"}__${normalizeEmail(correo)}`;
}

/**
 * Cuenta pantallas usadas agrupadas por (plataforma_id + correo) sobre TODO
 * el dataset recibido (sin filtrar por una plataforma en particular).
 * Generaliza el `usedByEmailPlat` que antes vivía inline en PantallasViewer.
 *
 * Devuelve un Map con clave `buildPidEmailKey(plataforma_id, correo)`.
 */
export function computeUsedByEmailPlatform(
  pantallas: PantallaUsoInput[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of pantallas) {
    const email = normalizeEmail(row.correo);
    if (!email || row.plataforma_id == null) continue;
    const key = buildPidEmailKey(row.plataforma_id, email);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/* =========================================================================
 * Números de pantalla (picker 1..N) tomados / disponibles
 * ========================================================================= */

/**
 * Filtra las filas de pantallas que "pertenecen" a un correo y/o cuenta
 * dentro de una plataforma. Si se pasa `cuentaId`, cualquier fila con ese
 * `cuenta_id` cuenta como del mismo titular aunque su correo actual sea
 * distinto (igual que `filtrarPantallasPorEmailOCuenta` original de
 * FormPantallas); si no, se filtra solo por correo normalizado.
 */
function filtrarPantallasPorCorreoOCuenta(
  pantallasDePlataforma: PantallaUsoInput[],
  correo: string | null | undefined,
  cuentaId?: number | string | null,
): PantallaUsoInput[] {
  const key = normalizeEmail(correo);
  const cid = toFiniteNumberOrNull(cuentaId);

  return pantallasDePlataforma.filter((row) => {
    if (cid !== null) {
      const rowCuentaId = toFiniteNumberOrNull(row.cuenta_id);
      if (rowCuentaId !== null && rowCuentaId === cid) return true;
    }
    return normalizeEmail(row.correo) === key;
  });
}

/** Parámetros para calcular los números de pantalla tomados/disponibles. */
export interface BuildNumerosPantallaParams {
  /** Plataforma para la que se calculan los números. */
  plataformaId: number | string;
  /** Catálogo completo de plataformas (para resolver la capacidad). */
  plataformas: PlataformaCapacidadInput[];
  /** Dataset de pantallas (global o ya filtrado por plataforma). */
  pantallas: PantallaUsoInput[];
  /** Correo del bloque/registro que se está creando o editando. */
  correo: string | null | undefined;
  /** Id de cuenta compartida asociada, si existe. */
  cuentaId?: number | string | null;
  /**
   * Id de una fila a excluir del conteo de "tomados" (edición en curso, para
   * no descontar el propio número de pantalla del registro que se edita).
   */
  excludeRowId?: number | string | null;
}

/** Resultado del cálculo de números de pantalla. */
export interface NumerosPantallaResult {
  plataformaId: number;
  /** Capacidad máxima resuelta desde `cantidad_pantallas`, o null si no hay. */
  capacidad: number | null;
  /** Números de pantalla (1..capacidad) ya ocupados por este correo/cuenta. */
  taken: number[];
  /** Números de pantalla (1..capacidad) libres para asignar. */
  free: number[];
}

/**
 * Calcula qué números de pantalla (1..capacidad) están tomados y cuáles
 * están libres para un correo/cuenta dentro de una plataforma. Generaliza
 * el picker que antes solo existía inline en FormPantallas (el bloque que
 * armaba `taken`/`free` a partir de `filtrarPantallasPorEmailOCuenta`).
 *
 * Sin capacidad válida no hay números que ofrecer: `free` queda vacío
 * (igual que el comportamiento original cuando `cap <= 0`).
 */
export function buildNumerosPantallaDisponibles(
  params: BuildNumerosPantallaParams,
): NumerosPantallaResult {
  const plataformaId = Number(params.plataformaId);
  const capacidad = resolveCapacidadPantallas(plataformaId, params.plataformas);

  const pantallasDePlataforma = filtrarPantallasDePlataforma(
    params.pantallas,
    plataformaId,
    params.excludeRowId,
  );

  const filasDelTitular = filtrarPantallasPorCorreoOCuenta(
    pantallasDePlataforma,
    params.correo,
    params.cuentaId,
  );

  const taken: number[] = [];
  const takenSet = new Set<number>();
  for (const row of filasDelTitular) {
    const raw = (row.nro_pantalla ?? "").toString().trim();
    const numero = Number(raw);
    if (Number.isInteger(numero) && numero >= 1 && !takenSet.has(numero)) {
      takenSet.add(numero);
      taken.push(numero);
    }
  }
  taken.sort((a, b) => a - b);

  const free: number[] = [];
  if (capacidad !== null && capacidad > 0) {
    for (let i = 1; i <= capacidad; i++) {
      if (!takenSet.has(i)) free.push(i);
    }
  }

  return { plataformaId, capacidad, taken, free };
}

/* =========================================================================
 * Validaciones puntuales
 * ========================================================================= */

/**
 * Verifica si un número de pantalla es un entero válido (>= 1) y, si se
 * conoce la capacidad, que no la exceda. Con `capacidad = null` (desconocida)
 * solo valida que sea un entero positivo.
 */
export function esNumeroPantallaValido(
  numero: unknown,
  capacidad: number | null,
): boolean {
  const n = Number(numero);
  if (!Number.isInteger(n) || n < 1) return false;
  if (capacidad !== null && n > capacidad) return false;
  return true;
}

/**
 * Verifica si un número de pantalla puntual está disponible dentro de la
 * lista `free` calculada por `buildNumerosPantallaDisponibles`.
 */
export function esNumeroPantallaDisponible(
  numero: unknown,
  free: number[],
): boolean {
  const n = Number(numero);
  return Number.isInteger(n) && free.includes(n);
}