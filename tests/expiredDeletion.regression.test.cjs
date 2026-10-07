/* eslint-disable @typescript-eslint/no-require-imports -- Node regression suite. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { deleteEmails } = require('../lib/emailDeletion.ts');
function fixture(kind, count = 1) {
  const platform = { id: 1, nombre: 'MAX' };
  let state = { admin: [{ id: 1, usuario: 'Admin' }], cuentascompletas: [], cuentascompartidas: [], pantallas: [], inventario: [], usuarios: [{ contacto: 'cliente' }], emailDeletionAudit: [], accountDataRevision: [], metricasmensuales: [] };
  const account = { correo: ' Example@TEST.com ', contrasena: 'Exact KEY ', plataforma_id: 1, plataformas: platform };
  if (kind === 'completa') for (let i=1;i<=count;i++) state.cuentascompletas.push({ ...account, id: BigInt(i), contacto: 'cliente' });
  else { state.cuentascompartidas.push({ ...account, id: 1 }); for(let i=1;i<=count;i++) state.pantallas.push({ id: i, cuenta_id: 1, contacto: 'cliente' }); }
  let failInventory = false;
  const matches = (row, where={}) => Object.entries(where).every(([key,value]) => {
    if(key === 'plataforma_id_correo') return row.plataforma_id === value.plataforma_id && row.correo === value.correo;
    if(key === 'pantallas' || key === 'cuentascompletas') return !state[key].some(item=>item.contacto === row.contacto);
    if(value && typeof value === 'object' && 'in' in value) return value.in.includes(row[key]);
    return row[key] === value;
  });
  const tx = { $queryRaw: async query => { const table=query.strings.join('').match(/FROM (\w+)/)[1]; return state[table].filter(row=>row.correo.trim().toLowerCase()===query.values[0]).map(row=>({id:row.id})); } };
  for(const table of Object.keys(state)) tx[table]={
    findMany: async ({where}={})=>structuredClone(state[table].filter(row=>matches(row,where))),
    findUnique: async ({where})=> { const row=state[table].find(row=>matches(row,where)); return row ? structuredClone(table==='pantallas'?{...row,cuentascompartidas:state.cuentascompartidas.find(a=>a.id===row.cuenta_id)}:row) : null; },
    upsert: async ({where,create,update})=> { if(table==='inventario'&&failInventory) throw Error('Inventory unavailable'); let row=state[table].find(row=>matches(row,where)); if(!row){row={id:BigInt(state[table].length+1),...structuredClone(create)};state[table].push(row);}else for(const [key,value] of Object.entries(update))row[key]=value&&typeof value==='object'&&'increment'in value?row[key]+value.increment:structuredClone(value); return structuredClone(row); },
    update: async ({where,data})=> {const row=state[table].find(row=>matches(row,where));Object.assign(row,structuredClone(data));return structuredClone(row);},
    deleteMany: async ({where}={})=> {const old=state[table].length;state[table]=state[table].filter(row=>!matches(row,where));return {count:old-state[table].length};}
  };
  const db = { $transaction: async work=> { const before=structuredClone(state);try{return await work(tx);}catch(error){state=before;throw error;} } };
  return {db,get state(){return state;},fail:()=>{failInventory=true;}};
}
for(const kind of ['completa','pantalla']) test('last '+kind+' moves to inventory atomically without either audit',async()=>{
  const f=fixture(kind); const result=await deleteEmails(f.db,{expiredTargets:[{tipo:kind,id:'1'}],adminId:1});
  assert.equal(f.state.inventario.length,1);assert.equal(f.state.inventario[0].correo,'example@test.com');assert.equal(f.state.inventario[0].clave,'Exact KEY ');
  assert.equal(f.state.cuentascompletas.length+f.state.cuentascompartidas.length+f.state.pantallas.length,0);assert.equal(f.state.emailDeletionAudit.length,0);assert.equal(result.revision,'1');
});
test('batch selecting all remaining screens preserves inventory',async()=>{
  const f=fixture('pantalla',2);await deleteEmails(f.db,{expiredTargets:[{tipo:'pantalla',id:'1'},{tipo:'pantalla',id:'2'}],adminId:1});assert.equal(f.state.inventario.length,1);assert.equal(f.state.emailDeletionAudit.length,0);assert.equal(f.state.pantallas.length,0);
});
test('definitive deletion clears all relations and repeated request cannot duplicate email/password audit',async()=>{
  const f=fixture('completa',2);await deleteEmails(f.db,{expiredTargets:[{tipo:'completa',id:'1'}],adminId:1});assert.equal(f.state.inventario.length,0);assert.equal(f.state.cuentascompletas.length,0);assert.equal(f.state.emailDeletionAudit.length,1);assert.equal(f.state.emailDeletionAudit[0].clave,'Exact KEY ');
  await deleteEmails(f.db,{expiredTargets:[{tipo:'completa',id:'1'}],adminId:1});assert.equal(f.state.emailDeletionAudit.length,1);
});
test('failed inventory transfer rolls back live data and audit',async()=>{
  const f=fixture('pantalla');const before=structuredClone(f.state);f.fail();await assert.rejects(deleteEmails(f.db,{expiredTargets:[{tipo:'pantalla',id:'1'}],adminId:1}),/Inventory unavailable/);assert.deepEqual(f.state,before);
});

for (const kind of ['completa', 'pantalla']) for (const enabled of [true, false]) test('explicit definitive deletion of final ' + kind + ' honors audit setting ' + enabled, async () => {
  const f = fixture(kind);
  for (const row of [...f.state.cuentascompletas, ...f.state.cuentascompartidas]) row.plataformas.auditarEliminaciones = enabled;
  await deleteEmails(f.db, { expiredTargets: [{ tipo: kind, id: '1' }], destino: 'eliminar', adminId: 1 });
  assert.equal(f.state.inventario.length, 0);
  assert.equal(f.state.cuentascompletas.length + f.state.cuentascompartidas.length + f.state.pantallas.length, 0);
  assert.equal(f.state.emailDeletionAudit.length, enabled ? 1 : 0);
});
test('explicit definitive batch does not retain final screens in inventory', async () => {
  const f = fixture('pantalla', 2);
  await deleteEmails(f.db, { expiredTargets: [{ tipo: 'pantalla', id: '1' }, { tipo: 'pantalla', id: '2' }], destino: 'eliminar', adminId: 1 });
  assert.equal(f.state.inventario.length, 0); assert.equal(f.state.pantallas.length, 0); assert.equal(f.state.emailDeletionAudit.length, 1);
});
