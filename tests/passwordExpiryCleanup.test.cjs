/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { passwordExpiryTransaction, expiryHeaders } = require('../lib/passwordExpiryCleanup.ts');
const { todayYMDBogota, addDaysYMD } = require('../lib/bogotaDate.ts');
const today = todayYMDBogota();
const date = offset => new Date(addDaysYMD(today, offset));
function fixture() {
  const account = { id: 10, correo: ' SAME@example.com ', contrasena: 'old', plataforma_id: 1, plataformas: { nombre: 'A' } };
  let state = {
    complete: [
      { id: 1n, correo: 'same@example.com', contrasena: 'old', fecha_vencimiento: date(-1), plataforma_id: 2, plataformas: { nombre: 'B' }, estado: 'ACTIVA' },
      { id: 2n, correo: 'other@example.com', contrasena: 'old', fecha_vencimiento: date(-1), plataforma_id: 2, plataformas: { nombre: 'B' } },
      { id: 3n, correo: 'same@example.com', contrasena: 'old', fecha_vencimiento: null, plataforma_id: 2, plataformas: { nombre: 'B' } },
    ],
    screens: [-2, -1, 1, 0].map((offset, index) => ({ id: index + 1, cuenta_id: 10, contacto: 'user'+index, fecha_vencimiento: date(offset), cuentascompartidas: account })),
    history: [], revision: 0, users: ['keep'], inventory: ['keep'], account,
  };
  let fail = '';
  const db = { async $transaction(work, options) {
    assert.equal(options.isolationLevel, 'Serializable');
    const draft = structuredClone(state);
    const model = key => ({
      findUnique: async ({where}) => draft[key].find(r=>r.id===where.id) ?? null,
      findMany: async ({where}) => draft[key].filter(r=>where.id.in.includes(r.id)),
      updateMany: async ({where,data}) => {
        if (fail === key) throw Error('injected failure');
        const rows = draft[key].filter(r=>where.id.in.includes(r.id));
        for(const row of rows) Object.assign(row,data);
        return {count:rows.length};
      },
    });
    const tx = {
      cuentascompletas: model('complete'), pantallas: model('screens'),
      cuentascompartidas: { updateMany: async ({where,data}) => { for(const row of draft.screens) if(where.id.in.includes(row.cuenta_id)) Object.assign(row.cuentascompartidas,data); return {count:where.id.in.length}; } },
      $queryRaw: async (parts, correo, platform) => {
        assert.match(parts.join(''), /plataforma_id = /);
        const key = parts.join('').includes('INNER JOIN') ? 'screens' : 'complete';
        return draft[key].filter(r=>(r.correo ?? r.cuentascompartidas.correo).trim().toLowerCase()===correo && (r.plataforma_id ?? r.cuentascompartidas.plataforma_id) === platform).map(r=>({id:r.id,cuenta_id:r.cuenta_id}));
      },
      deletedAccountHistory: { create: async ({data}) => { if(fail==='audit') throw Error('audit failure'); draft.history.push(data); } },
      accountDataRevision: {upsert: async()=>{ if(fail==='revision') throw Error('revision failure'); return {revision:BigInt(++draft.revision)}; }},
      draft,
    };
    const result = await work(tx); state=draft; return result;
  }};
  return { db, get state(){return state;}, fail(value){fail=value;} };
}
function edit(f, options={}) {
 const target=options.target ?? {tipo:'pantalla',id:'1'};
 const password=options.password === undefined ? 'new' : options.password;
 return passwordExpiryTransaction(f.db,target,password,options.admin === undefined ? 1 : options.admin, async tx=>{
   const row = target.tipo==='pantalla' ? tx.draft.screens.find(r=>r.id===Number(target.id)) : tx.draft.complete.find(r=>r.id===BigInt(target.id));
   if(target.tipo==='pantalla') row.cuentascompartidas.contrasena=password; else row.contrasena=password;
   if(options.renew) row.fecha_vencimiento=date(30);
   if(options.move) { if(target.tipo==='pantalla') row.cuentascompartidas.correo='new@example.com'; else row.correo='new@example.com'; }
   return 'saved';
 });
}

test('A: three assignments move together without deleting or losing their data',async()=>{
 const f=fixture(); f.state.screens.pop(); const before=structuredClone(f.state);
 const result=await edit(f);
 assert.equal(result.deletion.managed,3); assert.equal(f.state.screens.length,3);
 for(const [i,row] of f.state.screens.entries()) {
   assert.ok(row.passwordManagedAt instanceof Date);
   const original=before.screens[i];
   for(const field of ['id','contacto','fecha_vencimiento','cuenta_id']) assert.deepEqual(row[field],original[field]);
 }
 assert.deepEqual(f.state.complete,before.complete); assert.deepEqual(f.state.history,[]);
 assert.deepEqual(f.state.users,before.users); assert.deepEqual(f.state.inventory,before.inventory);
 assert.equal(JSON.parse(expiryHeaders(result.deletion)['X-Password-Records-Managed']).managed,3);
});
test('B/C: same email in another platform and another email on same platform stay unchanged',async()=>{
 const f=fixture(); f.state.complete[1].plataforma_id=1;
 const original=structuredClone(f.state.complete); await edit(f);
 assert.deepEqual(f.state.complete,original);
});
test('complete and screen assignments in same platform are managed together regardless of expiry',async()=>{
 const f=fixture(); f.state.complete[0].plataforma_id=1; f.state.complete[2].plataforma_id=1;
 const result=await edit(f);assert.equal(result.deletion.managed,6);
 assert.equal(f.state.complete.filter(r=>r.passwordManagedAt).length,2);
 assert.equal(f.state.screens.length,4);
});
test('E: subsequent reads and repeated changes retain same IDs without duplicate records',async()=>{
 const f=fixture();await edit(f);const ids=f.state.screens.map(r=>r.id);
 await edit(f,{password:'again'});
 assert.deepEqual(f.state.screens.map(r=>r.id),ids);
 assert.equal(f.state.screens.filter(r=>r.passwordManagedAt).length,4);
});
for(const fail of ['screens','complete','revision']) test('rollback password and all management changes on '+fail,async()=>{
 const f=fixture(), before=structuredClone(f.state); f.fail(fail);await assert.rejects(edit(f));assert.deepEqual(f.state,before);
});
test('unchanged password does not mark records',async()=>{const f=fixture();const r=await edit(f,{password:'old'});assert.equal(r.deletion,null);assert.ok(f.state.screens.every(r=>!r.passwordManagedAt));});
test('unauthenticated password change does not mutate data',async()=>{const f=fixture(),before=structuredClone(f.state);await assert.rejects(edit(f,{admin:null}));assert.deepEqual(f.state,before);});
