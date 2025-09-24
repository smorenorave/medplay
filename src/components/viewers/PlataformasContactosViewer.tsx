'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/* ---------------------------- Tipos ---------------------------- */
type Plataforma = { id: number; nombre: string };
type Contacto = { id: number; contacto: string; nombre?: string | null };
type Inventario = { id: number; plataforma_id: number; correo: string; clave: string | null };

/* ---------------------------- Utils ---------------------------- */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function Th(props: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  const { className = '', children, ...rest } = props;
  return (
    <th
      {...rest}
      className={[
        'px-3 py-2 text-left text-xs uppercase tracking-wide text-neutral-400 font-medium',
        'whitespace-nowrap sticky top-0 z-10 bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60',
        className,
      ].join(' ')}
    >
      {children}
    </th>
  );
}
function Td(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  const { className = '', children, ...rest } = props;
  return <td {...rest} className={['px-3 py-2 text-sm text-neutral-100 whitespace-nowrap', className].join(' ')}>{children}</td>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 overflow-hidden">{children}</div>;
}
function HeaderRow({
  title,
  onRefresh,
  refreshing,
}: { title: string; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2 sm:px-4">
      <h3 className="text-lg font-semibold text-neutral-100">{title}</h3>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
        >
          {refreshing ? 'Refrescando…' : 'Refrescar'}
        </button>
      )}
    </div>
  );
}

/* --------- Iconos inline --------- */
const EditIcon  = (p:any)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>);
const CheckIcon = (p:any)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M20 6L9 17l-5-5" /></svg>);
const XIcon     = (p:any)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>);
const TrashIcon = (p:any)=>(<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>);

/* =================================================================== */
/*                            Pane: Plataformas                         */
/* =================================================================== */
function PlataformasPane() {
  const [rows, setRows] = useState<Plataforma[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [nombre, setNombre] = useState('');
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const tblInput =
    'w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500';

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch('/api/plataformas', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar las plataformas');
      const data = await res.json();
      const list: Plataforma[] = (Array.isArray(data) ? data : []).map((p:any)=>({ id:Number(p.id), nombre:String(p.nombre ?? '') }));
      list.sort((a,b)=>a.nombre.localeCompare(b.nombre, undefined, {sensitivity:'base'}));
      setRows(list);
    } catch (e:any) { setErr(e?.message ?? 'Error al cargar'); setRows([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{ load(); },[load]);

  const onCreate = async (e:React.FormEvent) => {
    e.preventDefault();
    const nom = nombre.trim();
    if (!nom) return setFormErr('Escribe un nombre.');
    if (nom.length>100) return setFormErr('Máximo 100 caracteres.');
    setFormErr(null); setCreating(true);
    try {
      const res = await fetch('/api/plataformas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:nom})});
      if (!res.ok){ const j=await res.json().catch(()=>({})); if((j?.error||'').includes('unique')) throw new Error('Ya existe una plataforma con ese nombre.'); throw new Error(j?.error ?? 'No se pudo crear');}
      const saved = await res.json();
      setRows(rs=>[...rs,{id:Number(saved.id),nombre:String(saved.nombre)}].sort((a,b)=>a.nombre.localeCompare(b.nombre,undefined,{sensitivity:'base'})));
      setNombre('');
    } catch(e:any){ setFormErr(e?.message ?? 'Error al crear'); }
    finally{ setCreating(false); }
  };

  const beginEdit=(row:Plataforma)=>{ setEditingId(row.id); setDraftName(row.nombre); setSaveErr(null); };
  const cancelEdit=()=>{ setEditingId(null); setDraftName(''); setSaveErr(null); };
  const saveEdit=async()=>{
    if(editingId==null) return;
    const nom=draftName.trim();
    if(!nom) return setSaveErr('El nombre no puede estar vacío.');
    if(nom.length>100) return setSaveErr('Máximo 100 caracteres.');
    setSaving(true); setSaveErr(null);
    try{
      const res=await fetch(`/api/plataformas/${editingId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:nom})});
      if(!res.ok){const j=await res.json().catch(()=>({})); if((j?.error||'').includes('unique')) throw new Error('Ese nombre ya existe.'); throw new Error(j?.error ?? 'No se pudo guardar');}
      const upd=await res.json();
      setRows(rs=>rs.map(r=>r.id===editingId?{...r,nombre:String(upd?.nombre ?? nom)}:r).sort((a,b)=>a.nombre.localeCompare(b.nombre,undefined,{sensitivity:'base'})));
      cancelEdit();
    }catch(e:any){ setSaveErr(e?.message ?? 'Error al guardar'); } finally{ setSaving(false); }
  };

  const onDelete=async(row:Plataforma)=>{
    if(!confirm(`¿Eliminar la plataforma "${row.nombre}"?`)) return;
    try{
      const res=await fetch(`/api/plataformas/${row.id}`,{method:'DELETE'});
      if(res.ok){ setRows(rs=>rs.filter(r=>r.id!==row.id)); return; }
      const j=await res.json().catch(()=>({}));
      if(res.status===409){ alert(j?.message || 'No se puede eliminar: la plataforma tiene registros asociados.'); return; }
      throw new Error(j?.error ?? 'No se pudo eliminar');
    }catch(e:any){ alert(e?.message ?? 'Error al eliminar'); }
  };

  const filtered=useMemo(()=>{
    const tokens = norm(q).split(' ').filter(Boolean);
    if(!tokens.length) return rows;
    return rows.filter(r=>tokens.every(t=>norm(r.nombre).includes(t)));
  },[rows,q]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{ if(editingId==null) return; if(e.key==='Enter'){e.preventDefault(); saveEdit();} if(e.key==='Escape'){e.preventDefault(); cancelEdit();}};
    window.addEventListener('keydown',onKey); return ()=>window.removeEventListener('keydown',onKey);
  },[editingId,draftName]); // eslint-disable-line

  return (
    <Card>
      <HeaderRow title="Plataformas" onRefresh={load} refreshing={loading}/>
      <div className="px-3 pt-3 sm:px-4">
        <form onSubmit={onCreate} className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input className="h-10 w-full rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500" placeholder="Nombre de la plataforma" value={nombre} onChange={e=>setNombre(e.target.value)} maxLength={100}/>
            <button type="submit" disabled={creating} className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50">{creating?'Guardando…':'Agregar'}</button>
          </div>
          {formErr && <div className="text-sm text-red-300">{formErr}</div>}
        </form>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] px-3 py-3 sm:px-4">
        <input className="h-10 w-full rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500" placeholder="Buscar plataforma…" value={q} onChange={e=>setQ(e.target.value)}/>
        <button type="button" onClick={load} className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 hover:bg-neutral-800">Refrescar</button>
      </div>
      <div className="max-h-[56vh] overflow-auto custom-scroll">
        {err && <div className="p-3 text-sm text-red-300">Error: {err}</div>}
        {!err && (
          <table className="min-w-[520px] w-full table-fixed">
            <thead>
              <tr className="border-b border-neutral-800">
                <Th className="w-24 text-center">Acciones</Th>
                <Th>Nombre</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row,idx)=>{
                const isEditing=editingId===row.id;
                return (
                  <tr key={`plat-${row.id}-${idx}`} className={`border-b border-neutral-900 ${idx%2===0?'bg-neutral-900/30':'bg-transparent'} hover:bg-neutral-800/40`}>
                    <Td className="text-center">
                      {!isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={()=>beginEdit(row)} className="inline-flex items-center justify-center rounded-md p-2 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600" title="Editar"><EditIcon/></button>
                          <button type="button" onClick={()=>onDelete(row)} className="inline-flex items-center justify-center rounded-md p-2 text-red-200 hover:bg-red-800/30 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-600" title="Eliminar"><TrashIcon/></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={saveEdit} disabled={saving} className="inline-flex items-center justify-center rounded-md p-2 text-emerald-200 hover:bg-emerald-800/30 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50" title="Guardar (Enter)"><CheckIcon/></button>
                          <button type="button" onClick={cancelEdit} disabled={saving} className="inline-flex items-center justify-center rounded-md p-2 text-red-200 hover:bg-red-800/30 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50" title="Cancelar (Esc)"><XIcon/></button>
                        </div>
                      )}
                    </Td>
                    <Td>
                      {!isEditing ? row.nombre : (
                        <>
                          <input className={tblInput} value={draftName} onChange={e=>setDraftName(e.target.value)} maxLength={100} placeholder="Nombre"/>
                          {saveErr && <div className="mt-1 text-xs text-red-300">{saveErr}</div>}
                        </>
                      )}
                    </Td>
                  </tr>
                );
              })}
              {filtered.length===0 && (
                <tr><Td colSpan={2} className="text-neutral-300 text-sm py-4">No hay resultados.</Td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

/* =================================================================== */
/*                              Pane: Contactos                         */
/* =================================================================== */
function ContactosPane() {
  const [rows, setRows] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [nuevoContacto, setNuevoContacto] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<Contacto>>({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const tblInput =
    'w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500';

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch('/api/usuarios', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar los contactos');
      const data = await res.json();
      const list: Contacto[] = (Array.isArray(data) ? data : []).map((u:any,i:number)=>({ id:Number(u?.id ?? i+1), contacto:String(u?.contacto ?? ''), nombre:u?.nombre ?? null }));
      setRows(list);
    } catch (e:any) { setErr(e?.message ?? 'Error al cargar'); setRows([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{ load(); },[load]);

  const onCreate = async (e:React.FormEvent)=>{
    e.preventDefault();
    const c=nuevoContacto.trim(), n=nuevoNombre.trim();
    if(!c) return setFormErr('Escribe un contacto.');
    setFormErr(null); setCreating(true);
    try{
      const payload:any = { contacto:c }; if(n.length>0) payload.nombre=n;
      const res = await fetch('/api/usuarios',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!res.ok){ const j=await res.json().catch(()=>({})); throw new Error(j?.error ?? 'No se pudo crear');}
      const saved=await res.json();
      setRows(rs=>[...rs,{id:Number(saved.id ?? Date.now()), contacto:String(saved.contacto), nombre:saved.nombre ?? null }]);
      setNuevoContacto(''); setNuevoNombre('');
    }catch(e:any){ setFormErr(e?.message ?? 'Error al crear'); }
    finally{ setCreating(false); }
  };

  const beginEdit=(row:Contacto)=>{ setEditingId(row.id); setDraft({...row, nombre: row.nombre ?? ''}); setSaveErr(null); };
  const cancelEdit=()=>{ setEditingId(null); setDraft({}); setSaveErr(null); };
  const saveEdit=async()=>{
    if(editingId==null) return;
    const current = rows.find(r=>r.id===editingId);
    if(!current) return;

    const c=(draft.contacto ?? '').toString().trim();
    const nRaw=((draft.nombre ?? '') as string).trim();
    if(!c) return setSaveErr('El contacto no puede estar vacío.');

    setSaving(true); setSaveErr(null);
    try{
      const payload:any={}; if(c) payload.contacto=c; if(nRaw.length>0) payload.nombre=nRaw;
      const res=await fetch(`/api/usuarios/${encodeURIComponent(current.contacto)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const upd=await res.json().catch(()=>({}));
      if(!res.ok){ if(res.status===409 && upd?.error==='contacto_duplicado') throw new Error('Ese contacto ya existe.'); throw new Error(upd?.error ?? 'No se pudo guardar');}
      setRows(rs=>rs.map(r=>r.id===editingId?{...r, contacto:String(upd?.contacto ?? c), nombre:(upd?.nombre ?? nRaw) || null }:r));
      cancelEdit();
    }catch(e:any){ setSaveErr(e?.message ?? 'Error al guardar'); } finally{ setSaving(false); }
  };

  const onDelete=async(row:Contacto)=>{
    if(!confirm(`¿Eliminar el contacto "${row.contacto}"?`)) return;
    try{
      const res=await fetch(`/api/usuarios/${encodeURIComponent(row.contacto)}`,{method:'DELETE'});
      if(res.ok){ setRows(rs=>rs.filter(r=>r.contacto!==row.contacto)); return;}
      const j=await res.json().catch(()=>({}));
      if(res.status===409){ alert(j?.message || 'No se puede eliminar: el contacto tiene registros asociados.'); return; }
      throw new Error(j?.error ?? 'No se pudo eliminar');
    }catch(e:any){ alert(e?.message ?? 'Error al eliminar'); }
  };

  const filtered=useMemo(()=>{
    const tokens = norm(q).split(' ').filter(Boolean);
    if(!tokens.length) return rows;
    return rows.filter(r => tokens.every(t => norm(`${r.contacto} ${r.nombre ?? ''}`).includes(t)));
  },[rows,q]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{ if(editingId==null) return; if(e.key==='Enter'){e.preventDefault(); saveEdit();} if(e.key==='Escape'){e.preventDefault(); cancelEdit();}};
    window.addEventListener('keydown',onKey); return ()=>window.removeEventListener('keydown',onKey);
  },[editingId,draft]); // eslint-disable-line

  return (
    <Card>
      <HeaderRow title="Contactos" onRefresh={load} refreshing={loading}/>
      <div className="px-3 pt-3 sm:px-4">
        <form onSubmit={onCreate} className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className="h-10 w-full rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500" placeholder="Contacto (+57 3xx … o texto)" value={nuevoContacto} onChange={e=>setNuevoContacto(e.target.value)}/>
            <input className="h-10 w-full rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500" placeholder="Nombre (opcional)" value={nuevoNombre} onChange={e=>setNuevoNombre(e.target.value)}/>
            <button type="submit" disabled={creating} className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50">{creating?'Guardando…':'Agregar'}</button>
          </div>
          {formErr && <div className="text-sm text-red-300">{formErr}</div>}
        </form>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] px-3 py-3 sm:px-4">
        <input className="h-10 w-full rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500" placeholder="Buscar contacto o nombre…" value={q} onChange={e=>setQ(e.target.value)}/>
        <button type="button" onClick={load} className="h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 hover:bg-neutral-800">Refrescar</button>
      </div>
      <div className="max-h-[56vh] overflow-auto custom-scroll">
        {err && <div className="p-3 text-sm text-red-300">Error: {err}</div>}
        {!err && (
          <table className="min-w-[680px] w-full table-fixed">
            <thead>
              <tr className="border-b border-neutral-800">
                <Th className="w-24 text-center">Acciones</Th>
                <Th className="w-64">Contacto</Th>
                <Th>Nombre</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row,idx)=>{
                const isEditing=editingId===row.id;
                return (
                  <tr key={`ctc-${row.id}-${idx}`} className={`border-b border-neutral-900 ${idx%2===0?'bg-neutral-900/30':'bg-transparent'} hover:bg-neutral-800/40`}>
                    <Td className="text-center">
                      {!isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={()=>beginEdit(row)} className="inline-flex items-center justify-center rounded-md p-2 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600" title="Editar"><EditIcon/></button>
                          <button type="button" onClick={()=>onDelete(row)} className="inline-flex items-center justify-center rounded-md p-2 text-red-200 hover:bg-red-800/30 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-600" title="Eliminar"><TrashIcon/></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={saveEdit} disabled={saving} className="inline-flex items-center justify-center rounded-md p-2 text-emerald-200 hover:bg-emerald-800/30 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50" title="Guardar (Enter)"><CheckIcon/></button>
                          <button type="button" onClick={cancelEdit} disabled={saving} className="inline-flex items-center justify-center rounded-md p-2 text-red-200 hover:bg-red-800/30 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50" title="Cancelar (Esc)"><XIcon/></button>
                        </div>
                      )}
                    </Td>
                    <Td className="font-medium" title={row.contacto}>
                      {!isEditing ? row.contacto : (
                        <input className={tblInput} value={(draft.contacto as string) ?? row.contacto} onChange={e=>setDraft(d=>({...d,contacto:e.target.value}))}/>
                      )}
                    </Td>
                    <Td title={row.nombre ?? ''}>
                      {!isEditing ? (row.nombre ?? '—') : (
                        <input className={tblInput} value={(draft.nombre as string) ?? row.nombre ?? ''} onChange={e=>setDraft(d=>({...d,nombre:e.target.value}))}/>
                      )}
                    </Td>
                  </tr>
                );
              })}
              {filtered.length===0 && (<tr><Td colSpan={3} className="text-neutral-300 text-sm py-4">No hay resultados.</Td></tr>)}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

/* =================================================================== */
/*                       Pane: Inventario (buscador + lista + form)     */
/* =================================================================== */
function InventarioPane() {
  // plataformas
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [loadingPlat, setLoadingPlat] = useState(false);
  const [platErr, setPlatErr] = useState<string | null>(null);

  // filtros de búsqueda
  const [fPlataformaId, setFPlataformaId] = useState<number | ''>('');
  const [q, setQ] = useState('');

  // listado
  const [rows, setRows] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<Inventario>>({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // crear (form arriba)
  const [plataformaId, setPlataformaId] = useState<number | ''>('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  /* -------- cargar plataformas -------- */
  useEffect(() => {
    (async () => {
      setLoadingPlat(true); setPlatErr(null);
      try {
        const r = await fetch('/api/plataformas', { cache: 'no-store' });
        if (!r.ok) throw new Error('No se pudieron cargar las plataformas');
        const data = await r.json();
        const list: Plataforma[] = (Array.isArray(data) ? data : [])
          .map((p:any)=>({ id:Number(p.id), nombre:String(p.nombre ?? '') }))
          .sort((a,b)=>a.nombre.localeCompare(b.nombre, undefined, {sensitivity:'base'}));
        setPlataformas(list);
        if (!plataformaId && list.length) setPlataformaId(list[0].id);
      } catch (e:any) { setPlatErr(e?.message ?? 'Error al cargar plataformas'); }
      finally { setLoadingPlat(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- cargar inventario (GET) -------- */
  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams();
      if (fPlataformaId) params.set('plataforma_id', String(fPlataformaId));
      if (q.trim()) params.set('q', q.trim());
      const url = '/api/inventario' + (params.toString() ? `?${params}` : '');
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar el inventario');
      const data = await res.json();
      const list: Inventario[] = (Array.isArray(data) ? data : []).map((r:any)=>({
        id: Number(r.id),
        plataforma_id: Number(r.plataforma_id),
        correo: String(r.correo ?? ''),
        clave: r.clave ?? null,
      }));
      setRows(list);
    } catch (e:any) { setErr(e?.message ?? 'Error al cargar'); setRows([]); }
    finally { setLoading(false); }
  }, [fPlataformaId, q]);
  useEffect(()=>{ load(); }, [load]);

  /* -------- crear -------- */
  const canSubmit = plataformaId!=='' && correo.trim().length>4 && !creating && !loadingPlat;
  async function onCreate(e:React.FormEvent){
    e.preventDefault();
    setCreateErr(null); setOkMsg(null);
    if(!canSubmit) return;
    try{
      setCreating(true);
      const res = await fetch('/api/inventario',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ plataforma_id:Number(plataformaId), correo:correo.trim().toLowerCase(), clave:clave.trim() || null }),
      });
      if(!res.ok){ const j=await res.json().catch(()=>({})); throw new Error(j?.error ?? 'No se pudo guardar'); }
      const saved=await res.json().catch(()=>({}));
      setOkMsg(`Guardado: #${saved?.id ?? '—'}`);
      setCorreo(''); setClave('');
      load();
    }catch(e:any){ setCreateErr(e?.message ?? 'Error al guardar'); } finally{ setCreating(false); }
  }

  /* -------- edición -------- */
  const beginEdit=(row:Inventario)=>{ setEditingId(row.id); setDraft({...row}); setSaveErr(null); };
  const cancelEdit=()=>{ setEditingId(null); setDraft({}); setSaveErr(null); };
  const saveEdit=async()=>{
    if(editingId==null) return;
    const payload:any = {
      plataforma_id: Number(draft.plataforma_id),
      correo: String(draft.correo ?? '').trim().toLowerCase(),
      clave: (draft.clave ?? '') === '' ? null : (draft.clave ?? null),
    };
    if (!payload.plataforma_id || !payload.correo) {
      setSaveErr('Completa plataforma y correo.');
      return;
    }
    setSaving(true); setSaveErr(null);
    try{
      const res=await fetch(`/api/inventario/${editingId}`,{
        method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
      });
      if(!res.ok){ const j=await res.json().catch(()=>({})); throw new Error(j?.error ?? 'No se pudo guardar'); }
      const upd=await res.json().catch(()=>payload);
      setRows(rs=>rs.map(r=>r.id===editingId?{...r, ...upd}:r));
      cancelEdit();
    }catch(e:any){ setSaveErr(e?.message ?? 'Error al guardar'); } finally{ setSaving(false); }
  };
  const onDelete=async(row:Inventario)=>{
    if(!confirm(`¿Eliminar ${row.correo}?`)) return;
    try{
      const res=await fetch(`/api/inventario/${row.id}`,{method:'DELETE'});
      if(res.ok){ setRows(rs=>rs.filter(r=>r.id!==row.id)); return;}
      const j=await res.json().catch(()=>({}));
      if(res.status===409){ alert(j?.message || 'No se puede eliminar.'); return; }
      throw new Error(j?.error ?? 'No se pudo eliminar');
    }catch(e:any){ alert(e?.message ?? 'Error al eliminar'); }
  };

  /* -------- UI -------- */
  const input = 'h-10 w-full rounded-lg px-3 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500';
  const btn   = 'h-10 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-100 hover:bg-neutral-800 disabled:opacity-50';

  const platformMap = useMemo(() => {
    const m = new Map<number,string>();
    plataformas.forEach(p=>m.set(p.id, p.nombre));
    return m;
  }, [plataformas]);

  const filteredClient = useMemo(()=>{
    const tokens = norm(q).split(' ').filter(Boolean);
    if(!tokens.length) return rows;
    return rows.filter(r=>{
      const h = norm(`${platformMap.get(r.plataforma_id) ?? r.plataforma_id} ${r.correo} ${r.clave ?? ''}`);
      return tokens.every(t=>h.includes(t));
    });
  },[rows, q, platformMap]);

  return (
    <Card>
      <HeaderRow title="Inventario" onRefresh={load} refreshing={loading}/>
      <div className="px-3 pb-4 pt-3 sm:px-4 space-y-4">
        {platErr && <div className="rounded-lg border border-red-800/50 bg-red-950/30 p-3 text-sm text-red-200">{platErr}</div>}

        {/* Form de alta */}
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm mb-1 text-neutral-300">Plataforma</label>
            <select
              className={[input,'[&>option]:bg-neutral-900 [&>option]:text-neutral-100'].join(' ')}
              value={plataformaId === '' ? '' : String(plataformaId)}
              onChange={(e)=>setPlataformaId(e.target.value ? Number(e.target.value) : '')}
              disabled={loadingPlat || !!platErr}
              required
            >
              {plataformas.map(p=>(
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-neutral-300">Correo</label>
            <input type="email" className={input} placeholder="correo@dominio.com" value={correo} onChange={e=>setCorreo(e.target.value)} required/>
          </div>
          <div>
            <label className="block text-sm mb-1 text-neutral-300">Clave</label>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input type="text" className={input} placeholder="Opcional" value={clave} onChange={e=>setClave(e.target.value)}/>
              <button type="submit" className={btn} disabled={!canSubmit}>{creating?'Guardando…':'Agregar'}</button>
            </div>
          </div>
        </form>
        {okMsg && <div className="text-sm text-emerald-300">{okMsg}</div>}
        {createErr && <div className="text-sm text-red-300">Error: {createErr}</div>}

        {/* Buscador/lista */}
        <div className="grid gap-2 sm:grid-cols-[minmax(180px,280px)_1fr_auto]">
          <div>
            <label className="block text-sm mb-1 text-neutral-300">Plataforma (filtro)</label>
            <select
              className={[input,'[&>option]:bg-neutral-900 [&>option]:text-neutral-100'].join(' ')}
              value={fPlataformaId === '' ? '' : String(fPlataformaId)}
              onChange={(e)=>setFPlataformaId(e.target.value ? Number(e.target.value) : '')}
              disabled={loadingPlat || !!platErr}
            >
              <option value="">Todas</option>
              {plataformas.map(p=>(
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-neutral-300">Buscar</label>
            <input
              className={input}
              placeholder="Correo, clave…"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={load} className={btn}>Refrescar</button>
          </div>
        </div>

        <div className="max-h-[48vh] overflow-auto custom-scroll">
          {err && <div className="p-3 text-sm text-red-300">Error: {err}</div>}
          {!err && (
            <table className="min-w-[840px] w-full table-fixed">
              <thead>
                <tr className="border-b border-neutral-800">
                  <Th className="w-24 text-center">Acciones</Th>
                  <Th className="w-56">Plataforma</Th>
                  <Th className="w-[420px]">Correo</Th>
                  <Th>Clave</Th>
                </tr>
              </thead>
              <tbody>
                {filteredClient.map((row, idx) => {
                  const isEditing = editingId === row.id;
                  return (
                    <tr
                      key={`inv-${row.id}-${idx}`}
                      className={`border-b border-neutral-900 ${idx % 2 === 0 ? 'bg-neutral-900/30' : 'bg-transparent'} hover:bg-neutral-800/40`}
                    >
                      <Td className="text-center">
                        {!isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={()=>beginEdit(row)} className="inline-flex items-center justify-center rounded-md p-2 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-600" title="Editar"><EditIcon/></button>
                            <button type="button" onClick={()=>onDelete(row)} className="inline-flex items-center justify-center rounded-md p-2 text-red-200 hover:bg-red-800/30 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-600" title="Eliminar"><TrashIcon/></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={saveEdit} disabled={saving} className="inline-flex items-center justify-center rounded-md p-2 text-emerald-200 hover:bg-emerald-800/30 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50" title="Guardar (Enter)"><CheckIcon/></button>
                            <button type="button" onClick={cancelEdit} disabled={saving} className="inline-flex items-center justify-center rounded-md p-2 text-red-200 hover:bg-red-800/30 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50" title="Cancelar (Esc)"><XIcon/></button>
                          </div>
                        )}
                      </Td>

                      {/* Plataforma editable */}
                      <Td>
                        {!isEditing ? (
                          platformMap.get(row.plataforma_id) ?? row.plataforma_id
                        ) : (
                          <select
                            className={[input,'h-9 py-1 [&>option]:bg-neutral-900 [&>option]:text-neutral-100'].join(' ')}
                            value={String(draft.plataforma_id ?? row.plataforma_id)}
                            onChange={e=>setDraft(d=>({...d, plataforma_id:Number(e.target.value)}))}
                          >
                            {plataformas.map(p=>(
                              <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                          </select>
                        )}
                      </Td>

                      {/* Correo */}
                      <Td title={row.correo}>
                        {!isEditing ? (
                          row.correo
                        ) : (
                          <input
                            type="email"
                            className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                            value={(draft.correo as string) ?? row.correo}
                            onChange={e=>setDraft(d=>({...d, correo:e.target.value}))}
                          />
                        )}
                      </Td>

                      {/* Clave */}
                      <Td title={row.clave ?? ''}>
                        {!isEditing ? (
                          row.clave ?? '—'
                        ) : (
                          <input
                            type="text"
                            className="w-full rounded-md px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-100 outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-500"
                            value={(draft.clave as string) ?? row.clave ?? ''}
                            onChange={e=>setDraft(d=>({...d, clave:e.target.value}))}
                            placeholder="Opcional"
                          />
                        )}
                      </Td>
                    </tr>
                  );
                })}
                {filteredClient.length === 0 && (
                  <tr><Td colSpan={4} className="text-neutral-300 text-sm py-4">No hay resultados.</Td></tr>
                )}
              </tbody>
            </table>
          )}
          {saveErr && <div className="m-3 rounded-lg border border-red-800/50 bg-red-950/30 p-2 text-sm text-red-200">{saveErr}</div>}
        </div>
      </div>
    </Card>
  );
}

/* =================================================================== */
/*                         CONTENEDOR CON PESTAÑAS                      */
/* =================================================================== */
export default function PlataformasContactosInventarioViewer() {
  type Tab = 'plataformas' | 'contactos' | 'inventario';
  const [tab, setTab] = useState<Tab>('plataformas');

  const btnBase = 'px-4 py-2 rounded-xl border transition-colors';
  const active  = 'bg-gray-900 text-white border-gray-900';
  const idle    = 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-neutral-100">Plataformas, Contactos e Inventario</h2>

      {/* Tabs */}
      <div className="flex gap-2">
        <button className={`${btnBase} ${tab==='plataformas'?active:idle}`} onClick={()=>setTab('plataformas')}>Plataformas</button>
        <button className={`${btnBase} ${tab==='contactos'?active:idle}`} onClick={()=>setTab('contactos')}>Contactos</button>
        <button className={`${btnBase} ${tab==='inventario'?active:idle}`} onClick={()=>setTab('inventario')}>Inventario</button>
      </div>

      {/* Panel activo */}
      {tab==='plataformas' && <PlataformasPane/>}
      {tab==='contactos'   && <ContactosPane/>}
      {tab==='inventario'  && <InventarioPane/>}

      {/* Scrollbar discreto */}
      <style jsx global>{`
        .custom-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(120,120,120,0.35) transparent;
        }
        .custom-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(120,120,120,0.35);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(120,120,120,0.5); }
      `}</style>
    </div>
  );
}
