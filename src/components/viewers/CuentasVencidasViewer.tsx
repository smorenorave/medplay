"use client";
import { deleteExpiredAccounts, readCurrentAccountData, registerAccountCache } from "@/lib/accountDataChanges";
import { useAccountDataRefresh } from "@/hooks/useAccountDataRefresh";


import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useDeferredValue,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { usePlataformas } from "@/hooks/usePlataformas";
import { getDaily, setDaily, todayYMDLocal } from "@/lib/dailyCache";
import { readPasswordChanges, writePasswordChanges, recordPasswordChange, deletePasswordChange, isResolvedExpiration, readResolvedExpirations, PASSWORD_CHANGES_KEY, PASSWORD_CHANGES_EVENT } from "@/lib/passwordChanges";

/* ====================== Tipos ====================== */
type TipoRegistro = "cuenta" | "pantalla";

type Base = {
  id: number;
  plataforma_id: number | null;
  contacto: string;
  nombre: string | null;
  correo: string | null;
  contrasena: string | null;
  proveedor: string | null;
  fecha_compra: string | null; // YYYY-MM-DD
  fecha_vencimiento: string; // YYYY-MM-DD
  meses_pagados: number | null;
  total_pagado: number | null; // usar total_pagado
  total_pagado_proveedor: number | null;
  total_ganado: number | null;
  estado: string | null;
  comentario: string | null;
};

type Cuenta = Base & { tipo: "cuenta" };
type Pantalla = Base & { tipo: "pantalla"; nro_pantalla?: number | null };
type Registro = Cuenta | Pantalla;

type EditState = Partial<Registro> & {
  id: number;
  tipo: TipoRegistro;
  __original_contrasena?: string | null;
};

type ViewFilter = "todos" | "hoy" | "manana" | "anteriores";
type TipoFilter = "all" | "cuenta" | "pantalla";

/* ====================== Constantes (ajusta si necesitas) ====================== */
const DAILY_KEY = "__vencidas_daily_v6";
const CUENTAS_BASE = "/api/cuentascompletas";
const PANTALLAS_BASE = "/api/pantallas";
const CHECK_LAST_CUENTAS_URL = `${CUENTAS_BASE}/check-last`;
const CHECK_LAST_PANTALLAS_URL = `${PANTALLAS_BASE}/check-last`;
/** Normaliza texto para búsqueda: minúsculas, sin tildes y sin espacios */
const normSearch = (s?: string | null) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD") // separa diacríticos
    .replace(/\p{Diacritic}/gu, "") // quita tildes
    .replace(/\s+/g, ""); // elimina TODOS los espacios

/* ====================== Utils ====================== */
const NF_CO = new Intl.NumberFormat("es-CO");
const money = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? "—" : "$\u00A0" + NF_CO.format(v);

const isYYYYMMDD = (s?: string | null) =>
  !!(s && /^\d{4}-\d{2}-\d{2}$/.test(s));

const ymdAddDays = (baseYmd: string, days: number) => {
  const [y, m, d] = baseYmd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const ymdAddMonths = (baseYmd: string, months: number) => {
  if (!isYYYYMMDD(baseYmd)) return baseYmd;
  const [y, m, d] = baseYmd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + Number(months || 0));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate() + 0).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const today = () => todayYMDLocal();
const tomorrow = () => ymdAddDays(today(), 1);
const isToday = (ymd?: string | null) => ymd === today();
const isTomorrow = (ymd?: string | null) => ymd === tomorrow();
const isExpired = (ymd?: string | null) =>
  isYYYYMMDD(ymd) && (ymd as string) < today();

/* ====================== Modal con Portal + Scroll Freeze ====================== */
function Modal({
  children,
  onClose,
  className = "",
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  useLayoutEffect(() => {
    const y = window.scrollY;
    const html = document.documentElement as HTMLElement;
    const body = document.body as HTMLElement;
    const prevHtmlOv = html.style.overflow;
    const prevBodyOv = body.style.overflow;
    const prevPos = body.style.position;
    const prevTop = body.style.top;
    const prevLeft = body.style.left;
    const prevRight = body.style.right;
    const prevWidth = body.style.width;
    const prevPadR = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = prevPos;
      body.style.top = prevTop;
      body.style.left = prevLeft;
      body.style.right = prevRight;
      body.style.width = prevWidth;
      body.style.paddingRight = prevPadR;
      html.style.overflow = prevHtmlOv;
      body.style.overflow = prevBodyOv;
      window.scrollTo(0, y);
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`absolute inset-0 flex items-center justify-center p-4 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ====================== Sync entre pestañas / señales ====================== */
// Identificador de instancia + canales
const LS_BROADCAST_KEY = "__vencidas_sync__";
const INSTANCE_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random());

let bc: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  bc = new BroadcastChannel("vencidas-sync");
}

/* ====================== Fetchers ====================== */

async function pagedFetch(baseUrl: string) {
  const out: any[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const url = `${baseUrl}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
      }`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`GET ${baseUrl} -> ${res.status}`);
    const j: any = await res.json();
    const items: any[] = Array.isArray(j?.items)
      ? j.items
      : Array.isArray(j?.data)
        ? j.data
        : Array.isArray(j)
          ? j
          : [];
    out.push(...items);
    const next =
      j?.nextCursor ??
      j?.next_page_token ??
      j?.nextPageToken ??
      j?.cursor ??
      null;
    cursor = next ? String(next) : null;
    if (!cursor || items.length === 0) break;
  }
  return out;
}

let __allCuentasCache: Promise<Cuenta[]> | null = null;
async function fetchCuentasAll(): Promise<Cuenta[]> {
  if (!__allCuentasCache) {
    __allCuentasCache = (async () => {
      const todas = await pagedFetch(`${CUENTAS_BASE}?limit=500`);
      return (todas as any[]).map((r) => ({ ...r, tipo: "cuenta" as const }));
    })();
  }
  return __allCuentasCache;
}

let __allPantallasCache: Promise<Pantalla[]> | null = null;
registerAccountCache(() => { __allCuentasCache = null; __allPantallasCache = null; });
async function fetchPantallasAll(): Promise<Pantalla[]> {
  if (!__allPantallasCache) {
    __allPantallasCache = (async () => {
      const todas = await pagedFetch(`${PANTALLAS_BASE}?limit=500`);
      return (todas as any[]).map((r) => ({ ...r, tipo: "pantalla" as const }));
    })();
  }
  return __allPantallasCache;
}

async function fetchCuentas(): Promise<Cuenta[]> {
  const out = await pagedFetch(
    `${CUENTAS_BASE}?vencidas=1&limit=500&hoy=${today()}&manana=${tomorrow()}`
  );

  return (out as any[]).map((r) => ({
    ...r,
    tipo: "cuenta" as const,
  }));
}


async function fetchPantallas(): Promise<Pantalla[]> {
  const out = await pagedFetch(
    `${PANTALLAS_BASE}?vencidas=1&limit=500&hoy=${today()}&manana=${tomorrow()}`
  );

  return (out as any[]).map((r) => ({
    ...r,
    tipo: "pantalla" as const,
  }));
}


function fetchVencidasHoyManana(): Promise<Registro[]> { return readCurrentAccountData(fetchVencidasHoyMananaFromServer); }
async function fetchVencidasHoyMananaFromServer(): Promise<Registro[]> {
  const [cuentas, pantallas] = await Promise.all([
    fetchCuentas(),
    fetchPantallas(),
  ]);
  const key = (x: Registro) => `${x.tipo}:${x.id}`;
  const map = new Map<string, Registro>();
  [...cuentas, ...pantallas].forEach((r) => map.set(key(r), r));
  return Array.from(map.values());
}

/* ====================== Página ====================== */
export default function CuentasPantallasVencidasPage() {
  const { plataformas } = usePlataformas();

  const [allRows, setRows] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [source, setSource] = useState<"cache" | "server" | null>(null);

  const [q, setQ] = useState("");
  const dq = useDeferredValue(q); // búsqueda diferida
  const [platFilter, setPlatFilter] = useState<number | "all">("all");
  const [view, setView] = useState<ViewFilter>("hoy"); // default más útil
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("all"); // (5) filtro por pantalla / completas

  const [selected, setSelected] = useState<Set<string>>(new Set()); // key = tipo:id

  // Cola notificación
  type PwQueueItem = {
    pw: string;
    plataforma_id?: number;
  };

  const [pwNewByEmail, setPwNewByEmail] = useState<Record<string, PwQueueItem>>(
    () => readPasswordChanges()
  );
  const [resolvedExpirations, setResolvedExpirations] = useState(readResolvedExpirations);
  const rows = useMemo(() => allRows.filter((row) =>
    !isResolvedExpiration(row.correo, row.fecha_vencimiento, resolvedExpirations)
  ), [allRows, resolvedExpirations]);
  const updateHistory = (update: (prev: Record<string, PwQueueItem>) => Record<string, PwQueueItem>) => {
    writePasswordChanges(update(readPasswordChanges()));
  };

  // Añadir manualmente a la cola
  const [manualEmails, setManualEmails] = useState("");
  const [manualPw, setManualPw] = useState("");
  const [manualPlatform, setManualPlatform] = useState<number | "">("");

  const splitEmails = (raw: string) =>
    raw
      .split(/[\s,;]+/g) // separa por espacios, comas o ;
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addManualToQueue = () => {
    const emails = splitEmails(manualEmails);
    const pw = (manualPw || "").trim();

    if (emails.length === 0) {
      alert("Escribe al menos un correo.");
      return;
    }
    if (!pw) {
      alert("Escribe la nueva clave.");
      return;
    }
    if (!manualPlatform) {
      alert("Selecciona la plataforma.");
      return;
    }

    const invalid = emails.filter((e) => !isValidEmail(e));
    if (invalid.length > 0) {
      alert(`Correos inválidos:\n${invalid.slice(0, 10).join("\n")}${invalid.length > 10 ? "\n…" : ""}`);
      return;
    }

    updateHistory((prev) => {
      const next = { ...prev };
      for (const e of emails) {
        next[e] = {
          pw,
          plataforma_id: Number(manualPlatform),
        };
      }
      return next;
    });

    setManualEmails("");
    setManualPw("");
    setManualPlatform("");
  };

  // Editar
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const pwInputRef = useRef<HTMLInputElement | null>(null);
  const refreshSeq = useRef(0);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const definitiveWarning = "¿Estás seguro de que deseas eliminar esta cuenta definitivamente? Esta acción no se puede deshacer y la cuenta NO será enviada al inventario.";
  // Eliminar simple
  const [delModal, setDelModal] = useState<{
    open: boolean;
    row: Registro | null;
    busy?: boolean;
    definitive?: boolean;
    comment?: string;
  }>({
    open: false,
    row: null,
    busy: false,
  });

  // Inventario (último)
  const [invModal, setInvModal] = useState<{
    open: boolean;
    row: Registro | null;
    busy?: boolean;
    remaining?: number;
    comment?: string;
  }>({ open: false, row: null, busy: false, comment: "" });

  const [bulkDestino, setBulkDestino] = useState<"inventario" | "eliminar">("inventario");

  // Bulk
  const [bulkModal, setBulkModal] = useState<{
    open: boolean;
    rows: Registro[];
    lastKeys: Set<string>;
    normalKeys: Set<string>;
    scope: "selected" | "visible" | null;
    busy?: boolean;
    progress?: number;
    total?: number;
    invComment?: string; // (3) comentario para inventario en lote
  }>({
    open: false,
    rows: [],
    lastKeys: new Set(),
    normalKeys: new Set(),
    scope: null,
    busy: false,
    progress: 0,
    total: 0,
    invComment: "",
  });

  /* Boot con caché */
  useEffect(() => {
    (async () => {
      setErr(null);
      const cached = getDaily<Registro[]>(DAILY_KEY);
      if (cached && cached.length) {
        setRows(cached);
        setSource("cache");
        return;
      }
      try {
        setLoading(true);
        const data = await fetchVencidasHoyManana();
        setRows(data);
        setDaily(DAILY_KEY, data);
        setSource("server");
      } catch (e: any) {
        setErr(e?.message ?? "No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ====== Refresco con mínima diferencia (anti-parpadeo) ====== */
  const keyOf = (r: Registro) => `${r.tipo}:${r.id}`;
  const sameKeys = (a: Registro[], b: Registro[]) => {
    if (a.length !== b.length) return false;
    const sa = new Set(a.map(keyOf));
    for (const k of b.map(keyOf)) if (!sa.has(k)) return false;
    return true;
  };

  const forceRefresh = async () => {
    try {
      const seq = ++refreshSeq.current;
      setLoading(true);
      setErr(null);
      const data = await fetchVencidasHoyManana();
      if (seq !== refreshSeq.current) return; // respuesta tardía: descartar
      setDaily(DAILY_KEY, data);
      setSource("server");
      setRows((prev) => (sameKeys(prev, data) ? prev : data));
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo refrescar.");
    } finally {
      setLoading(false);
    }
  };

  /* ====== Suscripciones de actualización automática ====== */
  useEffect(() => {
    let canceled = false;
    let t: number | null = null;

    const refreshSoon = () => {
      if (canceled) return;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        forceRefresh();
        t = null;
      }, 400);
    };

    // a) BroadcastChannel -> solo cuando t === 'deleted'
    const onBC = (ev: MessageEvent) => {
      const msg = ev.data || {};
      if (msg.by === INSTANCE_ID) return;
      if (msg.t === "deleted") refreshSoon();
    };
    bc?.addEventListener?.("message", onBC);

    // b) Fallback localStorage -> solo cuando t === 'deleted'
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LS_BROADCAST_KEY || !e.newValue) return;
      try {
        const msg = JSON.parse(e.newValue);
        if (msg.by === INSTANCE_ID) return;
        if (msg.t === "deleted") refreshSoon();
      } catch { }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      canceled = true;
      if (t) window.clearTimeout(t);
      bc?.removeEventListener?.("message", onBC);
      window.removeEventListener("storage", onStorage);
    };
  }, []); // solo una vez

  useEffect(() => {
    const sync = () => {
      setPwNewByEmail(readPasswordChanges());
      setResolvedExpirations(readResolvedExpirations());
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === PASSWORD_CHANGES_KEY || event.key === "__pw_resolved_expirations_v1") sync();
    };
    window.addEventListener(PASSWORD_CHANGES_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PASSWORD_CHANGES_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /* Plataforma */
  const platformMap = useMemo(() => {
    const m = new Map<number, string>();
    plataformas.forEach((p) => m.set(p.id, (p as any).nombre ?? String(p.id)));
    return m;
  }, [plataformas]);
  const platformName = (pid?: number | null) =>
    pid == null
      ? "Sin plataforma"
      : platformMap.get(pid) ?? `Plataforma ${pid}`;
  const searchIndex = useMemo(() => {
    const idx = new Map<string, string>();
    for (const r of rows) {
      const blob = [
        r.contacto,
        r.nombre,
        r.correo,
        r.comentario,
        r.proveedor,
        r.fecha_compra,
        r.fecha_vencimiento,
        platformName(r.plataforma_id),
        r.tipo === "pantalla" ? "pantalla" : "cuenta completa",
      ]
        .map((x) => (x ?? "").toString())
        .join(" ");
      idx.set(`${r.tipo}:${r.id}`, normSearch(blob));
    }
    return idx;
  }, [rows, platformMap]);

  /* Filtro + búsqueda */
  const filtered = useMemo(() => {
    // 1) Filtrado por rango (hoy, mañana, anteriores, todos)
    const base = rows.filter((r) => {
      const fv = r.fecha_vencimiento;
      if (!isYYYYMMDD(fv)) return false;
      switch (view) {
        case "hoy":
          return isToday(fv);
        case "manana":
          return isTomorrow(fv);
        case "anteriores":
          return fv < today();
        case "todos":
          return fv < today() || isToday(fv) || isTomorrow(fv);
      }
    });

    // 2) Normaliza término y filtro de plataforma
    const term = normSearch(dq);
    const pid: number | null = platFilter === "all" ? null : Number(platFilter);

    // 3) Filtro por tipo
    const byTipo = base.filter((r) =>
      tipoFilter === "all" ? true : r.tipo === tipoFilter
    );

    // 4) Si no hay término ni plataforma, regresa byTipo
    if (!term && pid === null) return byTipo;

    // 5) Aplica filtros usando índice
    return byTipo.filter((r) => {
      if (pid !== null && r.plataforma_id !== pid) return false;
      if (!term) return true;
      const k = `${r.tipo}:${r.id}`;
      return (searchIndex.get(k) ?? "").includes(term);
    });
  }, [rows, view, dq, platFilter, tipoFilter, searchIndex]);

  /* ====== Inventario: check + helpers ====== */
  async function localCheckIsLast(r: Registro) {
    // Fallback más estricto: descarga TODOS (no solo vencidas) y filtra por plataforma+correo y tipo
    const [allC, allP] = await Promise.all([
      fetchCuentasAll(),
      fetchPantallasAll(),
    ]);
    const pool = r.tipo === "cuenta" ? allC : allP;
    const remaining = pool.filter(
      (x) =>
        x.plataforma_id === r.plataforma_id &&
        (x.correo || "").trim().toLowerCase() ===
        (r.correo || "").trim().toLowerCase()
    ).length;
    return { isLast: remaining <= 1, remaining };
  }

  const serverCheckIsLast = async (r: Registro) => {
    const { plataforma_id, correo, tipo } = r;
    if (!plataforma_id || !correo) return { isLast: false, remaining: 9999 };
    const url =
      tipo === "cuenta" ? CHECK_LAST_CUENTAS_URL : CHECK_LAST_PANTALLAS_URL;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plataforma_id, correo }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      return { isLast: !!j?.isLast, remaining: Number(j?.remaining ?? 0) };
    } catch {
      // Fallback: revisar TODAS las filas del tipo
      return await localCheckIsLast(r);
    }
  };

  useAccountDataRefresh(forceRefresh);

  const deleteRowDirect = async (r: Registro, motivo?: string, destino: "inventario" | "eliminar" = "inventario") => {
    await deleteExpiredAccounts([{ tipo: r.tipo === "cuenta" ? "completa" : "pantalla", id: String(r.id) }], motivo?.trim() || "Eliminación desde Vencimientos", destino);
    await forceRefresh();
    setSelected(new Set());
  };

  const onAskDelete = async (r: Registro) => {
    const chk = await serverCheckIsLast(r);
    if (chk.isLast) {
      setInvModal({
        open: true,
        row: r,
        remaining: chk.remaining,
        busy: false,
        comment: "",
      });
    } else {
      setDelModal({ open: true, row: r, busy: false });
    }
  };

  /* ====== BULK ====== */
  const collectRows = () =>
    rows.filter((r) => selected.has(`${r.tipo}:${r.id}`));

  const askBulkDelete = async () => {
    const list = collectRows();
    if (list.length === 0) {
      alert("No hay filas seleccionadas.");
      return;
    }
    setBulkDestino("inventario");
    // Pre-chequeo de "últimos"
    const checks = await Promise.all(
      list.map(async (r) => {
        const chk = await serverCheckIsLast(r);
        return { r, k: `${r.tipo}:${r.id}`, isLast: chk.isLast };
      })
    );
    const lastKeys = new Set(checks.filter((c) => c.isLast).map((c) => c.k));
    const normalKeys = new Set(checks.filter((c) => !c.isLast).map((c) => c.k));
    setBulkModal({
      open: true,
      rows: list,
      lastKeys,
      normalKeys,
      scope: "selected",
      busy: false,
      progress: 0,
      total: list.length,
      invComment: "",
    });
  };

  const processBulk = async () => {
    if (!bulkModal.open) return;
    const list = bulkModal.rows;
    setBulkModal(m => ({ ...m, busy: true, progress: 0 }));
    try {
      await deleteExpiredAccounts(list.map(r => ({ tipo: r.tipo === "cuenta" ? "completa" : "pantalla", id: String(r.id) })), bulkModal.invComment || "Eliminación masiva desde Vencidos", bulkDestino);
      await forceRefresh();
      setSelected(new Set());
      setBulkModal(m => ({ ...m, open: false, busy: false, progress: list.length }));
    } catch (error) {
      alert((error as Error).message);
      setBulkModal(m => ({ ...m, busy: false }));
    }
  };

  /* ====== Notificaciones (cola) ====== */
  const pwChangedEmails = useMemo(
    () => Object.keys(pwNewByEmail),
    [pwNewByEmail]
  );
  /* ====== Editar ====== */
  const openEdit = useCallback(
    (r: Registro, focus: "contacto" | "contrasena" = "contacto") => {
      setEdit({
        ...r,
        id: r.id,
        tipo: r.tipo,
        __original_contrasena: r.contrasena ?? "",
      });
      setTimeout(() => {
        (focus === "contrasena"
          ? pwInputRef.current
          : firstInputRef.current
        )?.focus();
      }, 0);
    },
    []
  );

  const closeEdit = useCallback(() => {
    setEdit(null);
  }, []);

  const computedVencimiento = useMemo(() => {
    if (!edit?.fecha_compra || edit.meses_pagados == null)
      return edit?.fecha_vencimiento || "";
    if (!isYYYYMMDD(edit.fecha_compra)) return edit.fecha_vencimiento || "";
    return ymdAddMonths(edit.fecha_compra, Number(edit.meses_pagados || 0));
  }, [edit?.fecha_compra, edit?.meses_pagados, edit?.fecha_vencimiento]);

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        contacto: edit.contacto ?? "",
        nombre: (edit.nombre ?? "") || null,
        correo: (edit.correo ?? "") || null,
        estado: (edit.estado ?? "") || null,
        comentario: (edit.comentario ?? "") || null,
        contrasena: (edit.contrasena ?? "") || null,
        fecha_compra: isYYYYMMDD(edit.fecha_compra ?? "")
          ? edit.fecha_compra
          : null,
        meses_pagados: Number.isFinite(Number(edit.meses_pagados))
          ? Number(edit.meses_pagados)
          : null,
        fecha_vencimiento:
          edit.fecha_compra &&
            edit.meses_pagados != null &&
            isYYYYMMDD(edit.fecha_compra)
            ? computedVencimiento
            : edit.fecha_vencimiento ?? null,
      };

      const base = edit.tipo === "cuenta" ? CUENTAS_BASE : PANTALLAS_BASE;
      const res = await fetch(`${base}/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? "No se pudo guardar");
      }
      const flat = await res.json().catch(() => ({}));

      const merged: Registro[] = rows.map((r) =>
        `${r.tipo}:${r.id}` === `${edit.tipo}:${edit.id}`
          ? ({
            ...r,
            contacto: flat?.row?.contacto ?? edit.contacto ?? r.contacto,
            nombre: flat?.row?.nombre ?? edit.nombre ?? r.nombre,
            correo: flat?.row?.correo ?? edit.correo ?? r.correo,
            estado: flat?.row?.estado ?? edit.estado ?? r.estado,
            comentario:
              flat?.row?.comentario ?? edit.comentario ?? r.comentario,
            contrasena:
              flat?.row?.contrasena ?? edit.contrasena ?? r.contrasena,
            fecha_compra:
              flat?.row?.fecha_compra ??
              (isYYYYMMDD(edit.fecha_compra ?? "")
                ? edit.fecha_compra
                : r.fecha_compra),
            meses_pagados:
              flat?.row?.meses_pagados ??
              (Number.isFinite(Number(edit.meses_pagados))
                ? Number(edit.meses_pagados)
                : r.meses_pagados),
            fecha_vencimiento:
              flat?.row?.fecha_vencimiento ??
              computedVencimiento ??
              r.fecha_vencimiento,
            tipo: r.tipo,
          } as Registro)
          : r
      );

      // Registrar el cambio confirmado y retirar el correo de vencimientos.
      const updated = merged.find(
        (r) => `${r.tipo}:${r.id}` === `${edit.tipo}:${edit.id}`
      )!;
      const oldPw = edit.__original_contrasena ?? "";
      const newPw = (flat?.row?.contrasena ?? edit.contrasena ?? "").toString();
      const emailForQueue = (
        flat?.row?.correo ??
        edit.correo ??
        updated.correo ??
        ""
      )
        .toString()
        .trim();
      if (newPw !== oldPw && emailForQueue) {
        recordPasswordChange(emailForQueue, newPw, updated.plataforma_id ?? undefined);
      }
      const T = today();
      const T1 = tomorrow();
      const next = merged.filter(
        (r) =>
          isYYYYMMDD(r.fecha_vencimiento) &&
          (r.fecha_vencimiento! < T ||
            r.fecha_vencimiento === T ||
            r.fecha_vencimiento === T1)
      );
      setRows(next);
      setDaily(DAILY_KEY, next);
      closeEdit();

      // 🔔 Cambios relevantes podrían venir de otros flujos: emite señal
      try {
        bc?.postMessage({
          t: "updated",
          key: `${edit.tipo}:${edit.id}`,
          by: INSTANCE_ID,
          at: Date.now(),
        });
      } catch { }
      localStorage.setItem(
        LS_BROADCAST_KEY,
        JSON.stringify({ t: "updated", by: INSTANCE_ID, at: Date.now() })
      );
    } catch (e: any) {
      alert(e?.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  /* KPIs */
  const { kpiHoy, kpiManana, kpiAnteriores } = useMemo(() => {
    let hoy = 0,
      man = 0,
      ant = 0;
    const T = today(),
      T1 = tomorrow();
    for (const r of rows) {
      const fv = r.fecha_vencimiento;
      if (!isYYYYMMDD(fv)) continue;
      if (fv < T) ant++;
      else if (fv === T) hoy++;
      else if (fv === T1) man++;
    }
    return { kpiHoy: hoy, kpiManana: man, kpiAnteriores: ant };
  }, [rows]);

  const visibleIds = useMemo(
    () => new Set(filtered.map((r) => `${r.tipo}:${r.id}`)),
    [filtered]
  );
  const allVisibleSelected =
    visibleIds.size > 0 && [...visibleIds].every((id) => selected.has(id));
  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected)
        filtered.forEach((r) => next.delete(`${r.tipo}:${r.id}`));
      else filtered.forEach((r) => next.add(`${r.tipo}:${r.id}`));
      return next;
    });
  };

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(pwChangedEmails.join(", "));
      alert("Correos copiados.");
    } catch {
      alert("No se pudo copiar al portapapeles.");
    }
  };

  /* ====================== Render ====================== */
  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-3 sm:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-end gap-3">
          <h1 className="text-2xl font-bold text-neutral-100">
            Cuentas y Pantallas (vencidas, hoy y mañana)
          </h1>
          <span className="text-sm text-neutral-400">
            • Fuente:{" "}
            {source ? (source === "cache" ? "Caché del día" : "Servidor") : "—"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={forceRefresh}
            disabled={loading}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? "Actualizando…" : "Refrescar"}
          </button>
        </div>
      </header>

      {/* Filtros */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por contacto, nombre, correo, plataforma, comentario…"
          className="flex-1 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
        />
        <select
          value={platFilter === "all" ? "" : String(platFilter)}
          onChange={(e) =>
            setPlatFilter(e.target.value ? Number(e.target.value) : "all")
          }
          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-neutral-100 outline-none focus:ring-2 focus:ring-sky-500 sm:w-48 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
        >
          <option value="">Todas las plataformas</option>
          {plataformas.map((p) => (
            <option key={p.id} value={p.id}>
              {(p as any).nombre ?? p.id}
            </option>
          ))}
        </select>
        {/* (5) Filtro por tipo */}
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as TipoFilter)}
          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-neutral-100 outline-none focus:ring-2 focus:ring-sky-500 sm:w-48 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
        >
          <option value="all">Cuentas y Pantallas</option>
          <option value="cuenta">Solo Cuentas completas</option>
          <option value="pantalla">Solo Pantallas</option>
        </select>
        <select
          value={view}
          onChange={(e) => setView(e.target.value as ViewFilter)}
          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-neutral-100 outline-none focus:ring-2 focus:ring-sky-500 sm:w-56 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
        >
          <option value="todos">Todos</option>
          <option value="hoy">Vencen hoy</option>
          <option value="manana">Vencen mañana</option>
          <option value="anteriores">Anteriores a hoy (vencidas)</option>
        </select>
      </section>

      {/* Acciones notificación */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-neutral-200">
            Correos con <em>cambio de clave</em> ({pwChangedEmails.length})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyEmails}
              disabled={pwChangedEmails.length === 0}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800 disabled:opacity-60"
            >
              Copiar correos
            </button>
            <button
              type="button"
              onClick={() => writePasswordChanges({})}
              disabled={pwChangedEmails.length === 0}
              className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-red-200 hover:bg-red-950/70 disabled:opacity-60"
              title="Limpiar el historial de cambios de clave"
            >
              Limpiar lista
            </button>
          </div>
        </div>
        {/* Añadir manualmente */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
          <div className="text-sm font-semibold text-neutral-200 mb-2">
            Añadir registros manualmente
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={manualEmails}
              onChange={(e) => setManualEmails(e.target.value)}
              placeholder="Correo(s): uno o varios (separados por coma/espacio/salto de línea)…"
              className="flex-1 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
            />

            <input
              value={manualPw}
              onChange={(e) => setManualPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addManualToQueue();
              }}
              placeholder="Nueva clave…"
              className="sm:w-64 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
            />

            <select
              value={manualPlatform}
              onChange={(e) =>
                setManualPlatform(e.target.value ? Number(e.target.value) : "")
              }
              className="sm:w-56 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 [&>option]:bg-neutral-900 [&>option]:text-neutral-100"
            >
              <option value="">Seleccionar plataforma</option>
              {plataformas.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p as any).nombre ?? p.id}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={addManualToQueue}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
              title="Añadir al historial"
            >
              Añadir
            </button>
          </div>
          <div className="mt-2 text-xs text-neutral-400">
            Tip: puedes pegar varios correos separados por comas, espacios o saltos de línea.
          </div>
        </div>


        <div className="flex flex-col gap-2">
          {pwChangedEmails.length === 0 ? (
            <span className="text-neutral-400 text-sm">
              No hay cambios de clave registrados (se añaden al guardar un registro con
              contraseña cambiada).
            </span>
          ) : (
            pwChangedEmails.map((email) => (
              <div key={email} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-3 py-1 text-sm text-neutral-200">
                  {email}
                  <button
                    type="button"
                    className="text-red-300 hover:text-red-200"
                    onClick={() => {
                      if (window.confirm(`¿Borrar el registro de cambio de clave de ${email}? La cuenta y su contraseña se conservarán.`)) {
                        deletePasswordChange(email);
                      }
                    }}
                    title="Borrar únicamente este registro"
                  >
                    Borrar
                  </button>
                </span>

                {/* 👇 AQUÍ VA EXACTAMENTE */}
                {pwNewByEmail[email]?.plataforma_id && (
                  <span className="text-xs text-neutral-400">
                    {platformName(pwNewByEmail[email].plataforma_id)}
                  </span>
                )}

                <input
                  type="text"
                  placeholder="Nueva clave…"
                  value={pwNewByEmail[email]?.pw ?? ""}
                  onChange={(e) =>
                    updateHistory((prev) => ({
                      ...prev,
                      [email]: {
                        ...prev[email],
                        pw: e.target.value,
                      },
                    }))
                  }
                  className="min-w-[240px] flex-1 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
                />
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-neutral-400">
          Nota: el script solo enviará si la fecha de vencimiento es{" "}
          <strong>posterior</strong> a HOY (lo valida en MySQL).
        </p>
      </section>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
        <KPI title="Anteriores (vencidas)" value={kpiAnteriores} />
        <KPI title="Vencen hoy" value={kpiHoy} />
        <KPI title="Vencen mañana" value={kpiManana} />
      </section>

      {/* Estados */}
      {loading && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 text-neutral-300">
          Cargando…
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-red-200">
          Error: {err}
        </div>
      )}

      {/* Tabla + Toolbar de borrado */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-neutral-200">
            Vista:{" "}
            {view === "todos"
              ? "Todos"
              : view === "hoy"
                ? "Vencen hoy"
                : view === "manana"
                  ? "Vencen mañana"
                  : "Anteriores a hoy (vencidas)"}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <button
              onClick={askBulkDelete}
              disabled={selected.size === 0}
              className="rounded-lg border border-rose-800 bg-rose-900/30 px-3 py-2 text-rose-100 hover:bg-rose-900/50 disabled:opacity-60"
              title="Eliminar los registros seleccionados"
            >
              Eliminar seleccionados
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:hidden">
          {filtered.map((r) => <article key={`mobile-${r.tipo}-${r.id}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-lg bg-sky-500/10 px-2 py-1 text-xs font-semibold text-sky-200">{platformName(r.plataforma_id)}</span><span className="rounded-lg bg-white/5 px-2 py-1 text-xs font-semibold text-neutral-300">{r.tipo === "pantalla" ? "Pantalla" : "Cuenta completa"}</span></div><h3 className="mt-3 truncate font-semibold text-white">{r.nombre || r.contacto || "Cliente sin nombre"}</h3><p className="mt-1 truncate text-sm text-neutral-400">{r.correo || "Sin correo"}</p></div><input type="checkbox" className="size-5 shrink-0 accent-sky-500" checked={selected.has(`${r.tipo}:${r.id}`)} onChange={() => setSelected((previous) => { const next = new Set(previous); const key = `${r.tipo}:${r.id}`; next.has(key) ? next.delete(key) : next.add(key); return next; })} aria-label={`Seleccionar ${r.tipo} ${r.id}`} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-neutral-500">Vencimiento</dt><dd className="mt-0.5 font-medium text-rose-200">{r.fecha_vencimiento || "—"}</dd></div><div><dt className="text-xs text-neutral-500">Contacto</dt><dd className="mt-0.5 truncate font-medium text-neutral-200">{r.contacto || "—"}</dd></div></dl>
            {r.comentario && <p className="mt-4 line-clamp-2 rounded-xl bg-white/[0.035] p-3 text-xs leading-5 text-neutral-400">{r.comentario}</p>}
            <button type="button" onClick={() => openEdit(r)} className="mt-4 min-h-11 w-full rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition active:scale-[0.98]">Ver y editar</button>
            <button type="button" onClick={() => setDelModal({ open: true, row: r, definitive: true })} className="mt-2 min-h-11 w-full rounded-xl border border-rose-700 bg-rose-900/40 px-3 py-2 text-sm font-semibold text-rose-200">Eliminar definitivamente</button>
          </article>)}
          {!filtered.length && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-neutral-400">No se encontraron resultados.</div>}
        </div>

        <div className="hidden overflow-auto rounded border border-neutral-800 md:block">
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="bg-neutral-900/70 sticky top-0 z-10">
              <tr className="text-xs uppercase text-neutral-400">
                <Th className="w-10">
                  <input
                    type="checkbox"
                    checked={
                      visibleIds.size > 0 &&
                      [...visibleIds].every((id) => selected.has(id))
                    }
                    onChange={toggleSelectAllVisible}
                    aria-label="Seleccionar todos (visibles)"
                  />
                </Th>
                <Th className="w-28">Acciones</Th>
                <Th>Plataforma</Th>
                <Th className="w-28">Tipo</Th>
                <Th>Contacto</Th>
                <Th>Nombre</Th>
                <Th>Correo</Th>
                <Th className="w-36">Clave</Th>
                <Th>fecha Compra</Th>
                <Th>fecha Vencimiento</Th>
                <Th className="text-right">total pagado</Th>
                <Th>Comentario</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={`${r.tipo}:${r.id}`}
                  className="border-t border-neutral-800 hover:bg-neutral-900/30 cursor-pointer"
                  onDoubleClick={() => openEdit(r)} // 👉 doble click fila para editar
                >
                  <Td className="align-middle">
                    <input
                      type="checkbox"
                      checked={selected.has(`${r.tipo}:${r.id}`)}
                      onChange={() =>
                        setSelected((prev) => {
                          const n = new Set(prev);
                          const k = `${r.tipo}:${r.id}`;
                          n.has(k) ? n.delete(k) : n.add(k);
                          return n;
                        })
                      }
                      aria-label={`Seleccionar fila ${r.id}`}
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button
                        title="Editar"
                        onClick={() => openEdit(r)}
                        className="text-neutral-300 hover:text-white inline-flex p-1 rounded-md hover:bg-neutral-800/60"
                        aria-label="Editar"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => setDelModal({ open: true, row: r, definitive: true })} className="text-rose-300 hover:text-rose-200 rounded-md p-1 text-xs">Eliminar definitivamente</button>
                      <button
                        title="Eliminar"
                        onClick={() => onAskDelete(r)}
                        className="text-rose-300 hover:text-rose-200 inline-flex p-1 rounded-md hover:bg-rose-900/30"
                        aria-label="Eliminar"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </Td>

                  <Td>{platformName(r.plataforma_id)}</Td>
                  <Td>
                    {r.tipo === "pantalla" ? "Pantalla" : "Cuenta completa"}
                  </Td>
                  <Td>{r.contacto || "—"}</Td>
                  <Td>{r.nombre || "—"}</Td>
                  <Td>
                    <span
                      className="inline-block max-w-[260px] truncate align-bottom"
                      title={r.correo ?? ""}
                    >
                      {r.correo || "—"}
                    </span>
                  </Td>

                  {/* Clave visible (edición por doble click de fila) */}
                  <Td className="whitespace-nowrap">
                    <span>{r.contrasena || "—"}</span>
                  </Td>

                  <Td className="text-center whitespace-nowrap">
                    {r.fecha_compra || "—"}
                  </Td>
                  <Td className="text-center whitespace-nowrap">
                    {r.fecha_vencimiento || "—"}
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {money(r.total_pagado)}
                  </Td>
                  <Td>
                    <span
                      className="inline-block max-w-[300px] truncate align-bottom"
                      title={r.comentario ?? ""}
                    >
                      {r.comentario || "—"}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-sm text-neutral-400">
          {filtered.length} fila(s) visibles
          {err && <span className="text-rose-400 ml-2">— {err}</span>}
        </div>
      </section>

      {/* Modal eliminar simple */}
      {delModal.open && delModal.row && (
        <Modal onClose={() => setDelModal({ open: false, row: null })}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-xl">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold">Confirmar eliminación</h3>
              <button
                className="px-2 py-1 hover:text-white"
                onClick={() => setDelModal({ open: false, row: null })}
                disabled={!!delModal.busy}
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {delModal.definitive && <p className="text-rose-200">{definitiveWarning}</p>}
              <p className="text-rose-200">Eliminar definitivamente borra todos los registros del correo en todas las plataformas: cuentas, pantallas e inventario. Se guarda en auditoría solo para las plataformas habilitadas en Configuración.</p>
              <p>
                ¿Seguro que deseas eliminar este registro{" "}
                <b>
                  {delModal.row.tipo === "pantalla"
                    ? "Pantalla"
                    : "Cuenta completa"}
                </b>{" "}
                de la plataforma{" "}
                <b>{platformName(delModal.row.plataforma_id)}</b>?
              </p>
            </div>
            <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                onClick={() => setDelModal({ open: false, row: null })}
                disabled={!!delModal.busy}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-rose-800 bg-rose-900/40 hover:bg-rose-900/60 disabled:opacity-60"
                onClick={async () => {
                  if (!delModal.row) return;
                  setDelModal((m) => ({ ...m, busy: true }));
                  try {
                    await deleteRowDirect(delModal.row, delModal.comment, delModal.definitive ? "eliminar" : "inventario");
                    setDelModal({ open: false, row: null });
                  } catch (e: any) {
                    alert(e?.message ?? "Error al eliminar");
                    setDelModal((m) => ({ ...m, busy: false }));
                  }
                }}
                disabled={!!delModal.busy}
              >
                {delModal.busy ? "Eliminando…" : delModal.definitive ? "Eliminar definitivamente" : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal inventario (último) */}
      {invModal.open && invModal.row && (
        <Modal onClose={() => setInvModal({ open: false, row: null })}>
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-xl">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold">
                Último registro por correo y plataforma
              </h3>
              <button
                className="px-2 py-1 hover:text-white"
                onClick={() => setInvModal({ open: false, row: null })}
                disabled={!!invModal.busy}
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p>
                Se está eliminando el <b>último registro</b> para el correo{" "}
                <b>{invModal.row.correo}</b> en la plataforma{" "}
                <b>{platformName(invModal.row.plataforma_id)}</b> dentro de{" "}
                <b>
                  {invModal.row.tipo === "cuenta"
                    ? "Cuentas completas"
                    : "Pantallas"}
                </b>
                .
              </p>
              {typeof invModal.remaining === "number" && (
                <p className="text-neutral-400">
                  Registros restantes (estimado): {invModal.remaining}
                </p>
              )}
              <label className="grid gap-1">
                <span className="text-sm text-neutral-300">
                  Comentario / motivo (opcional)
                </span>
                <textarea
                  rows={3}
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={invModal.comment ?? ""}
                  onChange={(e) =>
                    setInvModal((m) => ({ ...m, comment: e.target.value }))
                  }
                  placeholder="Ej: Última pantalla/cuenta. Se archiva por vencimiento."
                />
              </label>
              <p>
                Puedes conservarlo en <b>Inventario</b> o eliminarlo definitivamente. La eliminación definitiva se guarda en auditoría solo para las plataformas habilitadas en Configuración.
              </p>
              <p className="text-rose-200">La operación verifica nuevamente los registros existentes antes de confirmar el destino.</p>
            </div>
            <div className="px-5 py-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                onClick={() => setInvModal({ open: false, row: null })}
                disabled={!!invModal.busy}
              >
                Cancelar
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-rose-700 bg-rose-900/40 hover:bg-rose-900/60 disabled:opacity-60"
                  disabled={!!invModal.busy}
                  onClick={() => {
                    if (!invModal.row) return;
                    setDelModal({ open: true, row: invModal.row, definitive: true, comment: invModal.comment });
                    setInvModal({ open: false, row: null });
                  }}
                >Eliminar definitivamente</button>
                {/* Enviar a inventario y eliminar */}
                <button
                  className="px-3 py-2 rounded-lg border border-amber-700 bg-amber-800/40 hover:bg-amber-800/60 disabled:opacity-60"
                  onClick={async () => {
                    if (!invModal.row) return;
                    setInvModal((m) => ({ ...m, busy: true }));
                    try {
                      const r = invModal.row;
                      await deleteRowDirect(r, invModal.comment, "inventario");
                      setInvModal({ open: false, row: null });
                    } catch (e: any) {
                      alert(
                        e?.message ?? "Error al procesar inventario/eliminar"
                      );
                      setInvModal((m) => ({ ...m, busy: false }));
                    }
                  }}
                  disabled={!!invModal.busy}
                >
                  {invModal.busy
                    ? "Procesando…"
                    : "Enviar al inventario y eliminar"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal BULK */}
      {bulkModal.open && (
        <Modal
          onClose={() =>
            !bulkModal.busy &&
            setBulkModal({
              open: false,
              rows: [],
              lastKeys: new Set(),
              normalKeys: new Set(),
              scope: null,
              busy: false,
              progress: 0,
              total: 0,
              invComment: "",
            })
          }
        >
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-xl">
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold">Eliminar en lote</h3>
              <button
                className="px-2 py-1 hover:text-white"
                onClick={() =>
                  setBulkModal({
                    open: false,
                    rows: [],
                    lastKeys: new Set(),
                    normalKeys: new Set(),
                    scope: null,
                    busy: false,
                    progress: 0,
                    total: 0,
                    invComment: "",
                  })
                }
                disabled={!!bulkModal.busy}
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p className="text-rose-200">Elige el destino de los últimos registros. Enviar a Inventario los conserva sin auditoría. Eliminar definitivamente borra todos los registros de los correos seleccionados y genera auditoría solo para las plataformas habilitadas.</p>
              <p>
                Total a procesar: <b>{bulkModal.total}</b>
              </p>
              <p>
                Registros normales: <b>{bulkModal.normalKeys.size}</b>
              </p>
              <p>
                Registros “últimos” (correo+plataforma dentro de su tipo):{" "}
                <b>{bulkModal.lastKeys.size}</b>
              </p>
              {/* Lista de correos que irán a Inventario */}
              {(() => {
                const lastForInventory = bulkModal.rows.filter((r) =>
                  bulkModal.lastKeys.has(`${r.tipo}:${r.id}`)
                );
                if (lastForInventory.length === 0) return null;

                const copy = async () => {
                  try {
                    const text = lastForInventory
                      .map((r) => r.correo || "")
                      .filter(Boolean)
                      .join(", ");
                    await navigator.clipboard.writeText(text);
                    alert("Correos copiados al portapapeles.");
                  } catch {
                    alert("No se pudo copiar al portapapeles.");
                  }
                };

                return (
                  <div className="rounded-md border border-neutral-700 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">
                        Últimos registros detectados ({lastForInventory.length})
                      </div>
                      <button
                        onClick={copy}
                        className="rounded-md border border-neutral-700 px-2 py-1 hover:bg-neutral-800"
                      >
                        Copiar correos
                      </button>
                    </div>

                    <ul className="mt-2 max-h-40 overflow-auto list-disc pl-5 space-y-1">
                      {lastForInventory.map((r, i) => (
                        <li key={`${r.tipo}:${r.id}-${i}`}>
                          <span className="font-medium">{r.correo || "—"}</span>
                          <span className="text-neutral-400">
                            {" "}
                            — {platformName(r.plataforma_id)} ·{" "}
                            {r.tipo === "pantalla" ? "Pantalla" : "Cuenta"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              <fieldset disabled={!!bulkModal.busy} className="space-y-2">
                <legend>Destino de los últimos registros</legend>
                <label className="flex gap-2"><input type="radio" name="bulk-destino" checked={bulkDestino === "inventario"} onChange={() => setBulkDestino("inventario")} />Enviar a Inventario</label>
                <label className="flex gap-2"><input type="radio" name="bulk-destino" checked={bulkDestino === "eliminar"} onChange={() => setBulkDestino("eliminar")} />Eliminar definitivamente</label>
              </fieldset>
              {/* Comentario común para inventario en lote */}
              <label className="grid gap-1">
                <span className="text-sm text-neutral-300">
                  Comentario para Inventario (opcional, se aplica a los
                  “últimos”)
                </span>
                <textarea
                  rows={2}
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={bulkModal.invComment ?? ""}
                  onChange={(e) =>
                    setBulkModal((m) => ({ ...m, invComment: e.target.value }))
                  }
                  placeholder="Ej: Se archiva por limpieza de vencidas"
                />
              </label>

              {bulkModal.busy && (
                <div className="rounded-md border border-neutral-700 p-3">
                  Procesando… {bulkModal.progress}/{bulkModal.total}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                onClick={() =>
                  setBulkModal({
                    open: false,
                    rows: [],
                    lastKeys: new Set(),
                    normalKeys: new Set(),
                    scope: null,
                    busy: false,
                    progress: 0,
                    total: 0,
                    invComment: "",
                  })
                }
                disabled={!!bulkModal.busy}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-rose-800 bg-rose-900/40 hover:bg-rose-900/60 disabled:opacity-60"
                onClick={() => { if (bulkDestino !== "eliminar" || window.confirm(definitiveWarning)) void processBulk(); }}
                disabled={!!bulkModal.busy}
              >
                {bulkModal.busy ? "Eliminando…" : "Eliminar selección"}
              </button>

            </div>
          </div>
        </Modal>
      )}

      {/* Modal de edición */}
      {edit && (
        <Modal onClose={() => !saving && closeEdit()}>
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 rounded-t-2xl">
              <h3 className="font-semibold">Editar #{edit.id}</h3>
              <button
                className="px-2 py-1 hover:text-white"
                onClick={closeEdit}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <div className="p-5 grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <input
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none"
                  value={
                    edit.tipo === "pantalla" ? "Pantalla" : "Cuenta completa"
                  }
                  readOnly
                />
              </Field>
              <Field label="Plataforma">
                <input
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none"
                  value={platformName(
                    rows.find(
                      (r) => `${r.tipo}:${r.id}` === `${edit.tipo}:${edit.id}`
                    )?.plataforma_id
                  )}
                  readOnly
                />
              </Field>

              <Field label="Contacto">
                <input
                  ref={firstInputRef}
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.contacto ?? ""}
                  onChange={(e) =>
                    setEdit((s) => ({
                      ...(s as EditState),
                      contacto: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Nombre">
                <input
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.nombre ?? ""}
                  onChange={(e) =>
                    setEdit((s) => ({
                      ...(s as EditState),
                      nombre: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Correo">
                <input
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.correo ?? ""}
                  onChange={(e) =>
                    setEdit((s) => ({
                      ...(s as EditState),
                      correo: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Estado">
                <input
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.estado ?? ""}
                  onChange={(e) =>
                    setEdit((s) => ({
                      ...(s as EditState),
                      estado: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field
                label="Contraseña (doble click en la tabla para editar rápido)"
                full
              >
                <input
                  ref={pwInputRef}
                  type="text"
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.contrasena ?? ""}
                  onChange={(e) =>
                    setEdit((s) => ({
                      ...(s as EditState),
                      contrasena: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Fecha de compra">
                <div className="flex items-center gap-2">
                  <input
                    ref={dateRef}
                    type="date"
                    className="flex-1 rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600"
                    value={edit.fecha_compra ?? ""}
                    onChange={(e) =>
                      setEdit((s) => ({
                        ...(s as EditState),
                        fecha_compra: e.target.value,
                      }))
                    }
                    onMouseDown={(e) => {
                      const el = e.currentTarget;
                      if (
                        document.activeElement !== el &&
                        (el as any).showPicker
                      ) {
                        requestAnimationFrame(() => (el as any).showPicker());
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => (dateRef.current as any)?.showPicker?.()}
                    className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
                    title="Abrir calendario"
                  >
                    📅
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEdit((s) => ({
                        ...(s as EditState),
                        fecha_compra: today(),
                      }))
                    }
                    className="whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-neutral-100 hover:bg-neutral-800"
                    title="Poner fecha de compra en hoy"
                  >
                    Hoy
                  </button>
                </div>
              </Field>

              <Field label="Meses pagados">
                <input
                  type="number"
                  min={0}
                  className="rounded-lg px-3 py-2 border border-neutral-00 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.meses_pagados ?? ""}
                  onChange={(e) =>
                    setEdit((s) => ({
                      ...(s as EditState),
                      meses_pagados: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field label="Fecha de vencimiento (auto)" full>
                <input
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none"
                  value={computedVencimiento || ""}
                  readOnly
                />
              </Field>

              <Field label="Comentario" full>
                <textarea
                  rows={3}
                  className="rounded-lg px-3 py-2 border border-neutral-700 bg-neutral-950 outline-none focus:ring-2 focus:ring-neutral-600"
                  value={edit.comentario ?? ""}
                  onChange={(e) =>
                    setEdit((s) => ({
                      ...(s as EditState),
                      comentario: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <div className="px-5 py-3 border-t border-neutral-800 flex flex-wrap items-center justify-end gap-2 sticky bottom-0 bg-neutral-900 rounded-b-2xl">

              <button
                className="px-3 py-2 rounded-lg border border-neutral-600 hover:bg-neutral-800"
                onClick={closeEdit}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-emerald-700 bg-emerald-800/40 hover:bg-emerald-800/60 disabled:opacity-60"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ====================== UI bits ====================== */
function KPI({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-400">
        {title}
      </div>
      <div className="mt-1 text-2xl font-bold text-neutral-100">{value}</div>
    </div>
  );
}
function Th({
  children,
  className = "",
  ...rest
}: React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {
  className?: string;
}) {
  return (
    <th {...rest} className={`text-left px-3 py-2 ${className}`}>
      {children}
    </th>
  );
}
function Td({
  children,
  className = "",
  colSpan,
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  className?: string;
  colSpan?: number;
}) {
  return (
    <td {...rest} className={`px-3 py-2 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}
function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`grid gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm text-neutral-300">{label}</span>
      {children}
    </label>
  );
}
