/**
 * Único punto de verdad para "buscar o crear" una cuenta compartida por
 * correo + plataforma.
 *
 * Se usa desde FormPantallas (Generador) y desde PantallasViewer (editor)
 * para que ninguno de los dos implemente su propio check-then-create. Antes,
 * cada componente tenía su propia versión: la de FormPantallas confiaba
 * SOLO en una caché local (localStorage) para decidir si el correo ya
 * existía, sin preguntarle nunca al servidor; eso permitía que dos envíos
 * casi simultáneos (dos pestañas, dos personas cargando el formulario)
 * crearan dos filas de `cuentascompartidas` con el mismo correo+plataforma.
 *
 * Esta versión SIEMPRE consulta el servidor (sin cache) antes de decidir si
 * crea, igual que ya hacía PantallasViewer.
 *
 * IMPORTANTE: esto reduce la ventana de carrera pero no la elimina del todo
 * — dos requests que lleguen casi al mismo milisegundo podrían no alcanzar a
 * verse el uno al otro. La garantía definitiva debe venir de una
 * restricción UNIQUE en la base de datos sobre (plataforma_id, correo), más
 * que el endpoint POST /api/cuentascompartidas trate esa colisión como un
 * upsert (si el INSERT choca con el UNIQUE, buscar y devolver la fila
 * existente en vez de fallar). Este helper es la mitigación del lado del
 * cliente; el UNIQUE + upsert en el backend es la mitigación definitiva.
 */

function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

export interface CuentaCompartidaApiRow {
  id: number;
  correo: string | null;
  plataforma_id: number | string | null;
  contrasena?: string | null;
  [key: string]: unknown;
}

/**
 * Busca en el servidor (sin cache) si ya existe una cuenta compartida con
 * ese correo (+ plataforma, si se indica). Devuelve la fila cruda de la API
 * o null si no existe.
 *
 * Si se conoce `plataformaId`, se hace UNA sola petición filtrada por
 * plataforma+correo (es todo lo que hace falta para prevenir el duplicado
 * que nos interesa: mismo correo dos veces en la MISMA plataforma). Antes
 * esto además intentaba una segunda búsqueda sin filtrar por plataforma
 * "por si acaso", pero esa segunda vuelta no aporta nada a la prevención
 * de duplicados y solo agregaba un viaje de red extra (parte de la
 * lentitud reportada al crear un correo nuevo). Esa búsqueda "sin
 * plataforma" solo se usa cuando de verdad no se conoce la plataforma.
 */
export async function findCuentaCompartidaByCorreo(
  plataformaId: number | string | null | undefined,
  correo: string,
): Promise<CuentaCompartidaApiRow | null> {
  const email = normalizeEmail(correo);
  if (!email) return null;

  const url =
    plataformaId != null
      ? `/api/cuentascompartidas?correo=${encodeURIComponent(
          email,
        )}&plataforma_id=${plataformaId}`
      : `/api/cuentascompartidas?correo=${encodeURIComponent(email)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const rows: CuentaCompartidaApiRow[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.items)
        ? json.items
        : [];
    return (
      rows.find(
        (row) =>
          normalizeEmail(row?.correo) === email &&
          (plataformaId == null ||
            Number(row?.plataforma_id) === Number(plataformaId)),
      ) ?? null
    );
  } catch {
    return null;
  }
}

export interface UpsertCuentaCompartidaResult {
  id: number;
  /** true si esta llamada creó la fila; false si reutilizó una existente. */
  created: boolean;
}

/**
 * Busca una cuenta compartida existente por correo+plataforma en el
 * servidor; si existe, la reutiliza (y opcionalmente actualiza la clave si
 * se pasó una nueva). Si NO existe, la crea.
 *
 * Siempre consulta el servidor primero — nunca decide "no existe" en base
 * a una cache local — para minimizar la ventana en la que dos formularios
 * distintos crean el mismo correo dos veces.
 */
export async function upsertCuentaCompartida(
  plataformaId: number | string | null | undefined,
  correo: string,
  opts?: { contrasena?: string | null; proveedor?: string | null },
): Promise<UpsertCuentaCompartidaResult> {
  const email = normalizeEmail(correo);
  if (!email) {
    throw new Error("Correo vacío al crear/buscar cuenta compartida");
  }

  const existing = await findCuentaCompartidaByCorreo(
    plataformaId ?? null,
    email,
  );
  if (existing?.id) {
    const nuevaClave = (opts?.contrasena ?? "").trim();
    if (nuevaClave !== "") {
      try {
        await fetch(`/api/cuentascompartidas/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contrasena: nuevaClave }),
        });
      } catch {
        // no bloquea el flujo si el PATCH de la clave falla
      }
    }
    return { id: Number(existing.id), created: false };
  }

  const body: Record<string, unknown> = { correo: email };
  if (plataformaId != null) body.plataforma_id = plataformaId;
  if (opts?.contrasena && opts.contrasena.trim() !== "") {
    body.contrasena = opts.contrasena;
  }
  if (opts?.proveedor && opts.proveedor.trim() !== "") {
    body.proveedor = opts.proveedor;
  }

  const res = await fetch("/api/cuentascompartidas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error ?? "No se pudo crear la cuenta compartida");
  }
  const created = await res.json();
  if (!created?.id) {
    throw new Error("La API no devolvió id al crear cuentascompartidas");
  }
  return { id: Number(created.id), created: true };
}
