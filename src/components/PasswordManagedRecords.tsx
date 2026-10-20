"use client";
import type { DeletionSelection } from "@/lib/recordDeletionClient";

type ManagedRecord = {
  id: string | number; tipo: "cuenta" | "pantalla"; correo: string | null;
  [key: string]: unknown;
};
const columns = [
  ["plataforma", "Plataforma"], ["tipo", "Tipo"], ["contacto", "Contacto"],
  ["nombre", "Nombre"], ["correo", "Correo"], ["contrasena", "Clave"],
  ["nro_pantalla", "Pantalla"], ["pin", "PIN"], ["proveedor", "Proveedor"],
  ["fecha_compra", "Compra"], ["fecha_vencimiento", "Vencimiento"],
  ["meses_pagados", "Meses"], ["total_pagado", "Total pagado"],
  ["total_pagado_proveedor", "Pagado proveedor"], ["total_ganado", "Ganado"],
  ["comentario", "Comentarios"], ["passwordManagedAt", "Clave gestionada"],
] as const;
function display(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (key === "tipo") return value === "cuenta" ? "Cuenta completa" : "Pantalla";
  if (key.startsWith("fecha_") && typeof value === "string") return value.slice(0, 10).split("-").reverse().join("/");
  if (key === "passwordManagedAt" && typeof value === "string") return new Date(value).toLocaleString("es-CO", { timeZone: "America/Bogota" });
  return String(value);
}
function Detail({ value }: { value: Record<string, unknown> }) {
  return <dl className="grid gap-2 p-3">{Object.entries(value).filter(([key]) => key !== "estado").map(([key, item]) => <div key={key}>
    <dt className="font-semibold">{columns.find(([name]) => name === key)?.[1] ?? key}</dt>
    <dd className="whitespace-pre-wrap break-words">{item && typeof item === "object" ? <Detail value={item as Record<string, unknown>} /> : display(key, item)}</dd>
  </div>)}</dl>;
}
export default function PasswordManagedRecords({ items, onDelete }: { items: ManagedRecord[]; onDelete: (item: DeletionSelection) => void }) {
  return <section aria-label="Correos con cambio de clave" className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4 space-y-3">
    <div className="flex flex-wrap justify-between gap-2">
      <h2 className="text-sm font-semibold text-neutral-200">Correos con cambio de clave ({items.length})</h2>
      <button type="button" disabled={!items.length} onClick={() => navigator.clipboard.writeText([...new Set(items.map(r => r.correo).filter(Boolean))].join(", ")).catch(() => window.alert("No se pudo copiar al portapapeles."))} className="rounded-lg border border-neutral-700 px-3 py-2 disabled:opacity-50">Copiar correos</button>
    </div>
    <p className="text-sm text-neutral-400">Registros gestionados y conservados en la base de datos. Eliminar borra únicamente el registro elegido.</p>
    {!items.length ? <p className="text-neutral-400">No hay registros gestionados por cambio de clave.</p> : <div className="overflow-x-auto">
      <table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Acciones</th>{columns.map(([key, label]) => <th key={key} className="p-2 text-left whitespace-nowrap">{label}</th>)}</tr></thead>
        <tbody>{items.map(row => <tr key={`${row.tipo}:${row.id}`} className="border-t border-neutral-800">
          <td className="p-2 align-top"><button type="button" className="text-rose-300" onClick={() => onDelete({ tipo: row.tipo === "cuenta" ? "completa" : "pantalla", id: String(row.id), label: `${row.correo} · ${row.plataforma ?? ""}` })}>Eliminar</button>
            <details><summary className="cursor-pointer whitespace-nowrap">Ver todos los datos</summary><Detail value={row} /></details></td>
          {columns.map(([key]) => <td key={key} className="p-2 align-top whitespace-pre-wrap min-w-28">{display(key, row[key])}</td>)}
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
