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
      deleteMany: async ({where}) => {
        if (fail === key) throw Error('injected failure');
        const matches = r=>where.id.in.includes(r.id) && r.fecha_vencimiento && r.fecha_vencimiento <= where.fecha_vencimiento.lte;
        const count = draft[key].filter(matches).length;
        draft[key] = draft[key].filter(r=>!matches(r)); return {count};
      },
    });
    const tx = {
      cuentascompletas: model('complete'), pantallas: model('screens'),
      $queryRaw: async (parts, correo, cutoff) => {
        assert.match(parts.join(''), /fecha_vencimiento <= /);
        const key = parts.join('').includes('INNER JOIN') ? 'screens' : 'complete';
        return draft[key].filter(r=>(r.correo ?? r.cuentascompartidas.correo).trim().toLowerCase()===correo && r.fecha_vencimiento && r.fecha_vencimiento <= cutoff).map(r=>({id:r.id}));
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
test('expired password edit removes all expired normalized email assignments across types/platforms, includes today and preserves future/missing dates/other email',async()=>{
 const f=fixture(); const result=await edit(f);
 assert.equal(result.value,'saved'); assert.equal(result.deletion.deleted,4);
 assert.deepEqual(f.state.screens.map(r=>r.id),[3]); assert.deepEqual(f.state.complete.map(r=>r.id),[2n,3n]);
 assert.equal(f.state.history.length,4); assert.deepEqual(f.state.users,['keep']); assert.deepEqual(f.state.inventory,['keep']); assert.equal(f.state.account.contrasena,'new');
 assert.equal(JSON.parse(expiryHeaders(result.deletion)['X-Expired-Records-Deleted']).deleted,4);
});
test('three expired screens are all really removed',async()=>{const f=fixture(); f.state.screens[2].fecha_vencimiento=date(-1); await edit(f); assert.deepEqual(f.state.screens.map(r=>r.id),[]);});
test('complete account edit also deletes expired screens',async()=>{const f=fixture(); const r=await edit(f,{target:{tipo:'completa',id:'1'}}); assert.equal(r.deletion.deleted,4);});
for(const fail of ['screens','complete','audit','revision']) test('rollback credentials and all removals on '+fail,async()=>{const f=fixture();const original=structuredClone(f.state); f.fail(fail);await assert.rejects(edit(f));assert.deepEqual(f.state,original);});
for(const options of [{password:'old'},{target:{tipo:'pantalla',id:'3'}},{renew:true},{move:true}]) test('no cleanup for unchanged, valid, renewed or reassigned service '+JSON.stringify(options),async()=>{const f=fixture(); const r=await edit(f,options);assert.equal(r.deletion,null);assert.equal(f.state.screens.length,4);assert.equal(f.state.complete.length,3);});
test('unauthenticated destructive edit rolls back',async()=>{const f=fixture();const original=structuredClone(f.state);await assert.rejects(edit(f,{admin:null}));assert.deepEqual(f.state,original);});

for (const tipo of ['pantalla', 'completa']) test('changing password of a service expiring today deletes today and older, keeps tomorrow: '+tipo, async()=>{
 const f=fixture();
 if(tipo==='completa') f.state.complete[0].fecha_vencimiento=date(0);
 const result=await edit(f,{target:{tipo,id:tipo==='pantalla'?'4':'1'}});
 assert.equal(result.deletion.deleted,4);
 assert.deepEqual(f.state.screens.map(r=>r.id),[3]);
 assert.deepEqual(f.state.complete.map(r=>r.id),[2n,3n]);
 assert.equal(f.state.screens[0].fecha_vencimiento.toISOString(),date(1).toISOString());
});
test('legacy browser flags never hide records and password queue no longer creates them',()=>{
 const map=new Map([['__pw_resolved_expirations_v1',JSON.stringify({'same@example.com':'2099-01-01'})]]);
 global.localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 global.window={dispatchEvent(){}};
 const {recordPasswordChange,isResolvedExpiration}=require('../lib/passwordChanges.ts');
 const legacy=map.get('__pw_resolved_expirations_v1');recordPasswordChange(' SAME@example.com ','new',1);
 assert.equal(map.get('__pw_resolved_expirations_v1'),legacy);assert.equal(isResolvedExpiration('same@example.com',today),false);
 delete global.window;delete global.localStorage;
});
