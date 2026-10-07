/* eslint-disable @typescript-eslint/no-require-imports -- Node regression suite. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { deleteEmails } = require('../lib/emailDeletion.ts');
function fixture(kind, count = 1) {
  const platform = { id: 1, nombre: 'MAX' };
  let state = { admin: [{ id: 1, usuario: 'Admin' }], cuentascompletas: [], cuentascompartidas: [], pantallas: [], inventario: [], usuarios: [{ contacto: 'cliente' }], emailDeletionAudit: [], accountDataRevision: [], metricasmensuales: [] };
  const account = { correo: ' Example@TEST.com ', contrasena: 'Exact KEY ', fecha_vencimiento: new Date('2020-01-01'), plataforma_id: 1, plataformas: platform };
  if (kind === 'completa') for (let i=1;i<=count;i++) state.cuentascompletas.push({ ...account, id: BigInt(i), contacto: 'cliente' });
  else { state.cuentascompartidas.push({ ...account, id: 1 }); for(let i=1;i<=count;i++) state.pantallas.push({ id: i, cuenta_id: 1, contacto: 'cliente', fecha_vencimiento: new Date('2020-01-01') }); }
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
  await deleteEmails(f.db, { expiredTargets: [{ tipo: kind, id: '1' }], destino: 'eliminar', scopedExpired: true, expected: { correo: ' Example@TEST.com ', clave: 'Exact KEY ', plataformaId: 1, confirmado: true }, adminId: 1 });
  assert.equal(f.state.inventario.length, 0);
  assert.equal(f.state.cuentascompletas.length + f.state.cuentascompartidas.length + f.state.pantallas.length, 0);
  assert.equal(f.state.emailDeletionAudit.length, enabled ? 1 : 0);
});
test('definitive batches are refused without changes', async () => {
  const f = fixture('pantalla', 2), before = structuredClone(f.state);
  await assert.rejects(deleteEmails(f.db, { expiredTargets: [{ tipo: 'pantalla', id: '1' }, { tipo: 'pantalla', id: '2' }], destino: 'eliminar', scopedExpired: true, expected: { correo: ' Example@TEST.com ', clave: 'Exact KEY ', plataformaId: 1, confirmado: true }, adminId: 1 }), /único registro/);
  assert.deepEqual(f.state, before);
});
const safeRemove = (f, kind, extra = {}) => deleteEmails(f.db, { expiredTargets: [{ tipo: kind, id: '1' }], destino: 'eliminar', scopedExpired: true, expected: { correo: ' Example@TEST.com ', clave: 'Exact KEY ', plataformaId: 1, confirmado: true }, adminId: 1, ...extra });
for (const kind of ['pantalla', 'completa']) test('blocks active ' + kind + ' and rolls back everything', async () => {
  const f = fixture(kind); (kind === 'pantalla' ? f.state.pantallas : f.state.cuentascompletas)[0].fecha_vencimiento = new Date('2099-01-01');
  const before = structuredClone(f.state); await assert.rejects(safeRemove(f, kind), /usuarios activos/); assert.deepEqual(f.state, before);
});
test('another active screen prevents deleting its expired sibling and parent', async () => {
  const f = fixture('pantalla', 2); f.state.pantallas[1].fecha_vencimiento = new Date('2099-01-01');
  const before = structuredClone(f.state); await assert.rejects(safeRemove(f, 'pantalla'), /usuarios activos/); assert.deepEqual(f.state, before);
});
test('non-final and changed credentials are refused without any mutation', async () => {
  const f = fixture('pantalla', 2), before = structuredClone(f.state);
  await assert.rejects(safeRemove(f, 'pantalla'), /último registro/); assert.deepEqual(f.state, before);
  await assert.rejects(safeRemove(f, 'pantalla', { expected: { correo: ' Example@TEST.com ', clave: 'changed', plataformaId: 1, confirmado: true } }), /cuenta cambió/); assert.deepEqual(f.state, before);
});
test('selected final account deletes only its own IDs and preserves active accounts, users and inventory with the same email', async () => {
  const f = fixture('completa');
  f.state.cuentascompletas.push({ ...f.state.cuentascompletas[0], id: 2n, contrasena: 'other-key', fecha_vencimiento: new Date('2099-01-01') });
  f.state.inventario.push({ id: 4, correo: 'example@test.com', clave: 'other-key', plataforma_id: 1 });
  await safeRemove(f, 'completa');
  assert.deepEqual(f.state.cuentascompletas.map(row => row.id), [2n]); assert.equal(f.state.usuarios.length, 1); assert.equal(f.state.inventario.length, 1);
  assert.equal(f.state.emailDeletionAudit.length, 1); assert.equal(f.state.emailDeletionAudit[0].registros.eventos[0].cuentascompletas.length, 1);
});
test('ordinary expired deletion preserves other screens and parent without cascade', async () => {
  const f = fixture('pantalla', 2); f.state.pantallas[1].fecha_vencimiento = new Date('2099-01-01');
  await deleteEmails(f.db, { expiredTargets: [{ tipo: 'pantalla', id: '1' }], scopedExpired: true, adminId: 1 });
  assert.deepEqual(f.state.pantallas.map(row => row.id), [2]); assert.equal(f.state.cuentascompartidas.length, 1); assert.equal(f.state.usuarios.length, 1); assert.equal(f.state.inventario.length, 0);
});
test('a disappeared selection or missing confirmation fails closed', async () => {
  const f = fixture('completa'), before = structuredClone(f.state);
  await assert.rejects(safeRemove(f, 'completa', { expected: undefined }), /confirmación/);
  await assert.rejects(safeRemove(f, 'completa', { expiredTargets: [{ tipo: 'completa', id: '999' }] }), /ya no existe/);
  assert.deepEqual(f.state, before);
});

test('an active assignment of the same credentials on another account ID blocks definitive deletion', async () => {
  const f = fixture('completa');
  f.state.cuentascompartidas.push({ id: 5, correo: 'example@test.com', contrasena: 'Exact KEY ', plataforma_id: 1, plataformas: { id: 1, nombre: 'MAX' } });
  f.state.pantallas.push({ id: 8, cuenta_id: 5, contacto: 'cliente', fecha_vencimiento: new Date('2099-01-01') });
  const before = structuredClone(f.state); await assert.rejects(safeRemove(f, 'completa'), /usuarios activos/); assert.deepEqual(f.state, before);
});
test('unknown or current-day expiry cannot authorize irreversible removal', async () => {
  const { todayYMDBogota } = require('../lib/bogotaDate.ts');
  for (const expiry of [null, todayYMDBogota(), 'invalid']) {
    const f = fixture('completa'); f.state.cuentascompletas[0].fecha_vencimiento = expiry;
    const before = structuredClone(f.state); await assert.rejects(safeRemove(f, 'completa'), /usuarios activos/); assert.deepEqual(f.state, before);
  }
});
test('sending selected account to inventory cannot overwrite another password already in inventory', async () => {
  const f = fixture('completa'); f.state.inventario.push({ id: 9, plataforma_id: 1, correo: 'example@test.com', clave: 'belongs-to-other' });
  const before = structuredClone(f.state);
  await assert.rejects(deleteEmails(f.db, { expiredTargets: [{ tipo: 'completa', id: '1' }], scopedExpired: true, expected: { correo: ' Example@TEST.com ', clave: 'Exact KEY ', plataformaId: 1, confirmado: true }, adminId: 1 }), /sobrescribir/);
  assert.deepEqual(f.state, before);
});
test('a batch containing an active selection rolls back an earlier expired selection', async () => {
  const f = fixture('completa');
  f.state.cuentascompletas.push({ ...f.state.cuentascompletas[0], id: 2n, correo: 'z@example.com', fecha_vencimiento: new Date('2099-01-01') });
  const before = structuredClone(f.state);
  await assert.rejects(deleteEmails(f.db, { expiredTargets: [{ tipo: 'completa', id: '2' }, { tipo: 'completa', id: '1' }], scopedExpired: true, adminId: 1 }), /usuarios activos|confirmar su destino/);
  assert.deepEqual(f.state, before);
});

test('last record cannot silently go to inventory without the final credential decision', async () => {
  const f = fixture('completa'), before = structuredClone(f.state);
  await assert.rejects(deleteEmails(f.db, { expiredTargets: [{ tipo: 'completa', id: '1' }], scopedExpired: true, adminId: 1 }), /confirmar su destino/);
  assert.deepEqual(f.state, before);
});
test('confirmed inventory preserves the selected credentials and every user', async () => {
  const f = fixture('completa'); await safeRemove(f, 'completa', { destino: 'inventario' });
  assert.equal(f.state.cuentascompletas.length, 0); assert.equal(f.state.inventario[0].clave, 'Exact KEY ');
  assert.equal(f.state.usuarios.length, 1); assert.equal(f.state.emailDeletionAudit.length, 0);
});

test('an explicitly active assignment blocks removal even with an old expiry', async () => {
  const f = fixture('completa'); f.state.cuentascompletas[0].estado = 'ACTIVA';
  const before = structuredClone(f.state); await assert.rejects(safeRemove(f, 'completa'), /usuarios activos/); assert.deepEqual(f.state, before);
});

test('ordinary non-final complete deletion affects only its selected expired record', async () => {
  const f = fixture('completa', 2);
  await deleteEmails(f.db, { expiredTargets: [{ tipo: 'completa', id: '1' }], scopedExpired: true, adminId: 1 });
  assert.deepEqual(f.state.cuentascompletas.map(row => row.id), [2n]); assert.equal(f.state.usuarios.length, 1); assert.equal(f.state.inventario.length, 0);
});

test('expired A deletion preserves active B and C and their shared parent unchanged', async () => {
  const f = fixture('pantalla', 3);
  for (const row of f.state.pantallas.slice(1)) row.fecha_vencimiento = '2099-01-01';
  const others = structuredClone(f.state.pantallas.slice(1));
  const parent = structuredClone(f.state.cuentascompartidas);
  await deleteEmails(f.db, { expiredTargets: [{ tipo: 'pantalla', id: '1' }], scopedExpired: true, adminId: 1 });
  assert.deepEqual(f.state.pantallas, others); assert.deepEqual(f.state.cuentascompartidas, parent);
  assert.equal(f.state.inventario.length, 0); assert.equal(f.state.usuarios.length, 1);
});

test("ordinary selected deletion never transfers credentials used by an active complete account", async () => {
 const f = fixture("pantalla");
 f.state.cuentascompletas.push({ id: 9n, correo: "example@test.com", contrasena: "Exact KEY ", plataforma_id: 1, plataformas: { id: 1, nombre: "MAX" }, fecha_vencimiento: "2099-01-01", contacto: "cliente" });
 const others = structuredClone(f.state.cuentascompletas);
 await deleteEmails(f.db, { expiredTargets: [{ tipo: "pantalla", id: "1" }], scopedExpired: true, destino: "registro", adminId: 1 });
 assert.deepEqual(f.state.cuentascompletas, others); assert.equal(f.state.inventario.length, 0); assert.equal(f.state.pantallas.length, 0);
});
test("ordinary deletion refuses a record that became final after inspection", async () => {
 const f = fixture("completa"), before = structuredClone(f.state);
 await assert.rejects(deleteEmails(f.db, { expiredTargets: [{ tipo: "completa", id: "1" }], scopedExpired: true, destino: "registro", adminId: 1 }), /último registro/);
 assert.deepEqual(f.state, before);
});
