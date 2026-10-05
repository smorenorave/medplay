/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner loads TS through ts-node. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { restoreDeletedRecord, RestorationError } = require('../lib/restoreDeletedRecord.ts');
const { deleteEmails } = require('../lib/emailDeletion.ts');

function fixture() {
  const platform = { id: 1, nombre: 'Disney', auditarEliminaciones: true };
  const shared = { id: 7, correo: ' Original@Example.com ', contrasena: 'Exact KEY ', proveedor: 'Proveedor', plataforma_id: 1, cuenta_caida: false, plataformas: platform };
  const screen = { id: 9, cuenta_id: 7, contacto: '3001234567', nro_pantalla: '2', pin: '1234', fecha_compra: '2026-09-01T00:00:00.000Z', fecha_vencimiento: '2026-10-01T00:00:00.000Z', estado: 'VENCIDA', comentario: 'Original', meses_pagados: 1, total_pagado: '20.00', total_pagado_proveedor: '8.00', total_ganado: '12.00' };
  const complete = { id: '21', correo: shared.correo, contrasena: shared.contrasena, plataforma_id: 1, contacto: screen.contacto, proveedor: 'Proveedor', plataformas: platform, fecha_compra: screen.fecha_compra, fecha_vencimiento: screen.fecha_vencimiento, estado: 'VENCIDA', comentario: 'Venta completa', meses_pagados: 1, total_pagado_completa: '50.00', total_pagado_proveedor_completa: '30.00', total_ganado: '20.00' };
  const event = { fechaEliminacion: '2026-10-04T21:00:00.000Z', adminId: 1, eliminadoPor: 'Admin', cuentascompartidas: [shared], pantallas: [screen], cuentascompletas: [complete], inventario: [], usuarios: [{ contacto: screen.contacto, nombre: 'Ana Original' }] };
  let state = { admin: [{ id: 1, usuario: 'Admin' }], plataformas: [platform], cuentascompartidas: [], cuentascompletas: [], pantallas: [], inventario: [], usuarios: [], metricasmensuales: [{ id: 1 }], emailDeletionAudit: [{ id: 1n, correo: 'original@example.com', clave: shared.contrasena, claves: shared.contrasena, dedupeKey: null, plataformas: [platform], contactos: [screen.contacto], fechaEliminacion: new Date(event.fechaEliminacion), registros: { eventos: [event] }, revision: 1n }], accountDataRevision: [{ id: 1, revision: 1n }] };
  let fail = ''; let queue = Promise.resolve();
  const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
    if (key === 'pantallas' || key === 'cuentascompletas') return !state[key].some(item => item.contacto === row.contacto);
    if (value && typeof value === 'object' && 'in' in value) return value.in.includes(row[key]);
    return row[key] === value;
  });
  const tx = { $queryRaw: async query => {
    const table = query.strings.join('').match(/FROM (\w+)/)[1];
    return state[table].filter(row => row.correo.trim().toLowerCase() === query.values[0]).map(row => ({ id: row.id }));
  } };
  for (const table of Object.keys(state)) {
    const check = operation => { if (fail === `${table}.${operation}`) throw Error('Injected failure'); };
    tx[table] = {
      findMany: async ({ where, include } = {}) => structuredClone(state[table].filter(row => matches(row, where)).map(row => include?.plataformas ? { ...row, plataformas: state.plataformas.find(platform => platform.id === row.plataforma_id) ?? null } : row)),
      findUnique: async ({ where }) => structuredClone(state[table].find(row => matches(row, where)) ?? null),
      create: async ({ data }) => {
        check('create');
        if (state[table].some(row => table === 'usuarios' ? row.contacto === data.contacto : row.id === data.id)) throw Object.assign(Error('Duplicate'), { code: 'P2002' });
        if (table === 'pantallas' && (!state.cuentascompartidas.some(row => row.id === data.cuenta_id) || !state.usuarios.some(row => row.contacto === data.contacto))) throw Error('Foreign key violation');
        if (table === 'cuentascompletas' && !state.usuarios.some(row => row.contacto === data.contacto)) throw Error('Foreign key violation');
        state[table].push(structuredClone(data)); return structuredClone(data);
      },
      update: async ({ where, data }) => { check('update'); const row = state[table].find(row => matches(row, where)); Object.assign(row, structuredClone(data)); return structuredClone(row); },
      upsert: async ({ where, create, update }) => {
        check('upsert'); let row = state[table].find(row => matches(row, where));
        if (!row) { row = { id: BigInt(state[table].length + 1), ...structuredClone(create) }; state[table].push(row); }
        else for (const [key, value] of Object.entries(update)) row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : structuredClone(value);
        return structuredClone(row);
      },
      deleteMany: async ({ where } = {}) => { check('deleteMany'); const before = state[table].length; state[table] = state[table].filter(row => !matches(row, where)); return { count: before - state[table].length }; },
    };
  }
  const db = { ...tx, $transaction: (work) => {
    const operation = queue.then(async () => { const before = structuredClone(state); try { return await work(tx); } catch (error) { state = before; throw error; } });
    queue = operation.catch(() => {}); return operation;
  } };
  return { db, get state() { return state; }, screen, shared, complete, event, fail: value => { fail = value; } };
}
const target = { auditId: '1', evento: 0, tipo: 'pantalla', id: '9' };

test('restores the selected screen, parent and client with original dates, prices, PIN and IDs', async () => {
  const f = fixture(); const result = await restoreDeletedRecord(f.db, target, 1);
  assert.equal(result.revision, '2'); assert.equal(result.alreadyRestored, false);
  assert.deepEqual(result.correos, ['original@example.com']);
  const restored = f.state.pantallas[0];
  assert.equal(restored.id, 9); assert.equal(restored.cuenta_id, 7); assert.equal(restored.pin, '1234');
  assert.equal(restored.fecha_compra.toISOString(), f.screen.fecha_compra); assert.equal(restored.fecha_vencimiento.toISOString(), f.screen.fecha_vencimiento);
  assert.equal(restored.total_pagado, '20.00'); assert.equal(restored.total_ganado, '12.00'); assert.equal(restored.estado, 'VENCIDA');
  assert.equal(f.state.cuentascompartidas[0].contrasena, 'Exact KEY '); assert.equal(f.state.usuarios[0].nombre, 'Ana Original');
  assert.equal(f.state.cuentascompletas.length, 0); assert.equal(f.state.inventario.length, 0); assert.equal(f.state.metricasmensuales.length, 0);
  assert.deepEqual(f.state.emailDeletionAudit[0].registros.eventos[0], f.event);
  assert.equal(f.state.emailDeletionAudit[0].registros.restauraciones[0].restauradoPor, 'Admin');
  assert.equal(f.state.emailDeletionAudit[0].fechaEliminacion.toISOString(), f.event.fechaEliminacion);
});

test('restores a complete account to its original table without moving it to inventory', async () => {
  const f = fixture(); await restoreDeletedRecord(f.db, { ...target, tipo: 'completa', id: '21' }, 1);
  assert.equal(f.state.cuentascompletas[0].id, 21n); assert.equal(f.state.cuentascompletas[0].total_pagado_completa, '50.00');
  assert.equal(f.state.pantallas.length, 0); assert.equal(f.state.inventario.length, 0);
});

test('simultaneous requests and retries cannot restore the same record twice', async () => {
  const f = fixture(); const results = await Promise.all([restoreDeletedRecord(f.db, target, 1), restoreDeletedRecord(f.db, target, 1)]);
  assert.equal(results[1].alreadyRestored, true); assert.equal(f.state.pantallas.length, 1);
  assert.equal(f.state.emailDeletionAudit[0].registros.restauraciones.length, 1); assert.equal(f.state.accountDataRevision[0].revision, 2n);
});

test('reuses an existing original parent and keeps current client information', async () => {
  const f = fixture(); f.state.cuentascompartidas.push(structuredClone(f.shared)); f.state.usuarios.push({ contacto: f.screen.contacto, nombre: 'Ana Actualizada' });
  await restoreDeletedRecord(f.db, target, 1);
  assert.equal(f.state.cuentascompartidas.length, 1); assert.equal(f.state.usuarios[0].nombre, 'Ana Actualizada');
});

for (const conflict of ['screen-id', 'parent-id', 'screen-number', 'new-parent', 'missing-platform', 'missing-client-snapshot', 'incomplete-snapshot', 'stale-event', 'wrong-record']) {
  test(`restoration refuses ${conflict} without partial writes`, async () => {
    const f = fixture(); let request = target;
    if (conflict === 'screen-id') f.state.pantallas.push({ ...f.screen, contacto: 'someone-else' });
    if (conflict === 'parent-id') f.state.cuentascompartidas.push({ ...f.shared, contrasena: 'new password' });
    if (conflict === 'screen-number') { f.state.cuentascompartidas.push(f.shared); f.state.pantallas.push({ ...f.screen, id: 10 }); }
    if (conflict === 'new-parent') f.state.cuentascompartidas.push({ ...f.shared, id: 8 });
    if (conflict === 'missing-platform') f.state.plataformas.length = 0;
    if (conflict === 'missing-client-snapshot') f.event.usuarios.length = 0;
    if (conflict === 'incomplete-snapshot') delete f.event.pantallas[0].fecha_vencimiento;
    if (conflict === 'stale-event') request = { ...target, evento: 1 };
    if (conflict === 'wrong-record') request = { ...target, id: '999' };
    const before = structuredClone(f.state);
    await assert.rejects(restoreDeletedRecord(f.db, request, 1), RestorationError);
    assert.deepEqual(f.state, before);
  });
}

for (const failure of ['pantallas.create', 'usuarios.create', 'emailDeletionAudit.update', 'accountDataRevision.upsert', 'metricasmensuales.deleteMany']) {
  test(`restoration rolls back on ${failure} failure`, async () => {
    const f = fixture(); const before = structuredClone(f.state); f.fail(failure);
    await assert.rejects(restoreDeletedRecord(f.db, target, 1), /Injected failure/); assert.deepEqual(f.state, before);
  });
}

test('later deletion retains restoration history and a later deletion can be restored again', async () => {
  const f = fixture(); await restoreDeletedRecord(f.db, target, 1);
  await deleteEmails(f.db, { correos: ['original@example.com'], adminId: 1 });
  const audit = f.state.emailDeletionAudit[0];
  assert.equal(audit.registros.eventos.length, 2); assert.equal(audit.registros.restauraciones.length, 1);
  await assert.rejects(restoreDeletedRecord(f.db, target, 1), /historial cambió/);
  await restoreDeletedRecord(f.db, { ...target, evento: 1 }, 1);
  assert.equal(f.state.pantallas.length, 1); assert.equal(f.state.emailDeletionAudit[0].registros.restauraciones.length, 2);
});

const Module = require('node:module'); const path = require('node:path'); const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) { if (request.startsWith('@/lib/')) request = path.join(__dirname, '../lib', request.slice(6)); return originalResolve.call(this, request, ...args); };
let routeFixture; let sessionId = 1;
require.cache[require.resolve('../lib/db.ts')] = { exports: { prisma: new Proxy({}, { get: (_target, key) => routeFixture.db[key] }) } };
require.cache[require.resolve('../lib/adminSession.ts')] = { exports: { getAuthenticatedAdminId: async () => sessionId } };
const route = require('../src/app/api/admin/deletions/restore/route.ts');
const request = body => new Request('http://localhost/api/admin/deletions/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('restore endpoint rejects unauthenticated and malformed requests', async () => {
  routeFixture = fixture(); sessionId = null;
  assert.equal((await route.POST(request(target))).status, 401); sessionId = 1;
  for (const body of [{ ...target, auditId: '0' }, { ...target, tipo: 'inventario' }, { ...target, id: '2147483648' }, { ...target, auditId: '18446744073709551616' }, { ...target, evento: -1 }, { ...target, correo: 'attacker@example.com' }]) assert.equal((await route.POST(request(body))).status, 400);
  assert.equal(routeFixture.state.pantallas.length, 0);
});

test('restore endpoint returns success, conflicts and missing audits through the real handler', async () => {
  routeFixture = fixture(); sessionId = 1;
  assert.equal((await route.POST(request({ ...target, auditId: '999' }))).status, 404);
  assert.equal((await route.POST(request(target))).status, 200);
  assert.equal((await (await route.POST(request(target))).json()).alreadyRestored, true);
  routeFixture = fixture(); routeFixture.state.pantallas.push({ ...routeFixture.screen, id: 9 });
  assert.equal((await route.POST(request(target))).status, 409);
});
