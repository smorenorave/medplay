/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner loads TS through ts-node. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { deleteEmails, auditIdentity } = require('../lib/emailDeletion.ts');
const { deletionAuditFilters } = require('../lib/deletionAuditFilters.ts');

// Transactional adapter, with simulated referential constraints; no MySQL required.
function fixture() {
  const p1 = { id: 1, nombre: 'MAX', auditarEliminaciones: true }, p2 = { id: 2, nombre: 'Netflix', auditarEliminaciones: true };
  let state = {
    admin: [{ id: 1, usuario: 'auditor' }],
    cuentascompartidas: [{ id: 1, correo: ' Test@Example.com ', contrasena: 'shared-key', plataformas: p1 }, { id: 2, correo: 'test@example.com', contrasena: 'duplicate-key', plataformas: p2 }, { id: 3, correo: 'other@example.com', contrasena: 'keep', plataformas: p1 }],
    cuentascompletas: [{ id: 10n, correo: 'TEST@example.com', contrasena: 'full-key', contacto: 'only-full', plataformas: p2 }, { id: 11n, correo: 'test@example.com', contrasena: 'full-key-2', contacto: 'shared-client', plataformas: p1 }, { id: 12n, correo: 'other@example.com', contrasena: 'keep', contacto: 'shared-client', plataformas: p1 }],
    inventario: [{ id: 1, correo: 'test@example.com', clave: 'inventory-key', plataformas: p1 }, { id: 2, correo: ' TEST@example.com ', clave: 'inventory-key-2', plataformas: p2 }, { id: 3, correo: 'other@example.com', clave: 'keep', plataformas: p1 }],
    pantallas: [{ id: 1, cuenta_id: 1, contacto: 'only-screen' }, { id: 2, cuenta_id: 2, contacto: 'shared-client' }, { id: 3, cuenta_id: 3, contacto: 'shared-client' }],
    usuarios: [{ contacto: 'only-full', nombre: 'A' }, { contacto: 'only-screen', nombre: 'B' }, { contacto: 'shared-client', nombre: 'C' }],
    metricasmensuales: [{ id: 1, year: 2026, month: 9, clientesActivos: 3 }],
    emailDeletionAudit: [], accountDataRevision: [], deletedAccountHistory: [],
  };
  for (const table of ['cuentascompartidas', 'cuentascompletas', 'inventario']) for (const row of state[table]) row.plataforma_id = row.plataformas.id;
  let failure = ''; let conflict = 0; let queue = Promise.resolve();
  const options = []; const queries = [];
  function matches(table, row, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (key === 'plataforma_id_correo') return row.plataforma_id === value.plataforma_id && row.correo === value.correo;
      if (key === 'pantallas') return !state.pantallas.some(r => r.contacto === row.contacto);
      if (key === 'cuentascompletas') return !state.cuentascompletas.some(r => r.contacto === row.contacto);
      if (value && typeof value === 'object' && 'in' in value) return value.in.includes(row[key]);
      if (value && typeof value === 'object' && 'contains' in value) return String(row[key]).includes(value.contains);
      if (value && typeof value === 'object' && 'array_contains' in value) return value.array_contains.every(wanted => row[key].some(actual => Object.entries(wanted).every(([field, expected]) => actual[field] === expected)));
      if (value && typeof value === 'object') return Object.entries(value).every(([operator, expected]) => expected === undefined || (operator === 'gte' ? row[key] >= expected : operator === 'gt' ? row[key] > expected : operator === 'lte' ? row[key] <= expected : operator === 'lt' ? row[key] < expected : false));
      return row[key] === value;
    });
  }
  const tx = { $queryRaw: async query => {
    queries.push(query);
    const table = query.strings.join('?').match(/FROM (\w+)/)[1];
    return state[table].filter(row => row.correo.trim().toLowerCase() === query.values[0]).map(row => ({ id: row.id }));
  } };
  for (const table of Object.keys(state)) {
    const check = action => { if (failure === `${table}.${action}`) throw new Error('Injected failure'); };
    tx[table] = {
      findMany: async ({ where } = {}) => structuredClone(state[table].filter(row => matches(table, row, where))),
      count: async ({ where } = {}) => state[table].filter(row => matches(table, row, where)).length,
      delete: async ({ where }) => {
        const row = state[table].find(item => matches(table, item, where));
        state[table] = state[table].filter(item => item !== row);
        return structuredClone(row);
      },
      findUnique: async ({ where }) => {
        const row = state[table].find(row => matches(table, row, where));
        if (!row) return null;
        return structuredClone(table === 'pantallas' ? { ...row, cuentascompartidas: state.cuentascompartidas.find(account => account.id === row.cuenta_id) } : row);
      },
      upsert: async ({ where, create, update }) => {
        check('upsert');
        let row = state[table].find(row => matches(table, row, where));
        if (row) {
          for (const [key, value] of Object.entries(update)) row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : structuredClone(value);
        } else {
          row = { id: BigInt(state[table].length + 1), primeraEliminacion: new Date(), ...structuredClone(create) };
          state[table].push(row);
        }
        return structuredClone(row);
      },
      deleteMany: async ({ where } = {}) => {
        check('deleteMany');
        const removed = state[table].filter(row => matches(table, row, where));
        if (table === 'cuentascompartidas' && removed.some(row => state.pantallas.some(screen => screen.cuenta_id === row.id))) throw Error('Foreign key violation');
        state[table] = state[table].filter(row => !removed.includes(row));
        return { count: removed.length };
      },
    };
  }
  const db = { $transaction: (work, option) => {
    if (Array.isArray(work)) return Promise.all(work);
    options.push(option);
    const execute = async () => {
      if (conflict-- > 0) throw Object.assign(new Error('Deadlock'), { code: 'P2034' });
      const before = structuredClone(state);
      try { return await work(tx); } catch (error) { state = before; throw error; }
    };
    const result = queue.then(execute);
    queue = result.catch(() => {});
    return result;
  } };
  Object.assign(db, tx);
  return { db, originalTransaction: db.$transaction, get state() { return state; }, options, queries, fail: value => { failure = value; }, conflicts: value => { conflict = value; } };
}
const remove = f => deleteEmails(f.db, { correos: [' TEST@example.com ', 'test@example.com'], adminId: 1, motivo: 'Cuenta retirada' });

test('deletes duplicate email accounts across every live table/platform and retains unrelated clients', async () => {
  const f = fixture(); const result = await remove(f);
  assert.deepEqual(result.deleted, { pantallas: 2, compartidas: 2, completas: 2, inventario: 2, clientes: 2 });
  for (const table of ['cuentascompartidas', 'cuentascompletas', 'inventario']) {
    assert.deepEqual(f.state[table].map(row => row.correo), ['other@example.com']);
    assert.equal(f.state[table].filter(row => row.correo.toLowerCase().includes('test@')).length, 0);
  }
  assert.deepEqual(f.state.pantallas, [{ id: 3, cuenta_id: 3, contacto: 'shared-client' }]);
  assert.deepEqual(f.state.usuarios.map(row => row.contacto), ['shared-client']);
  assert.equal(f.state.metricasmensuales.length, 0); assert.equal(f.state.admin.length, 1);
  assert.equal(f.options[0].isolationLevel, 'Serializable'); assert.equal(result.revision, '1');
  assert.equal(f.state.emailDeletionAudit.length, 6);
  const audit = f.state.emailDeletionAudit.find(row => row.clave === 'full-key');
  assert.equal(audit.correo, 'test@example.com'); assert.equal(audit.adminId, 1);
  assert.equal(audit.eliminadoPor, 'auditor'); assert.equal(audit.motivo, 'Cuenta retirada');
  assert.deepEqual(audit.plataformas.map(row => row.id), [2]);
  assert.equal(audit.claves, 'full-key');
  const event = audit.registros.eventos[0];
  assert.equal(event.cuentascompletas[0].id, '10'); assert.equal(event.pantallas.length, 0); assert.equal(event.usuarios.length, 1);
});

test('retries and simultaneous modules produce one audit and one deletion event', async () => {
  const f = fixture(); await Promise.all([remove(f), remove(f), remove(f)]);
  const audit = structuredClone(f.state.emailDeletionAudit[0]); const result = await remove(f);
  assert.equal(f.state.emailDeletionAudit.length, 6); assert.deepEqual(f.state.emailDeletionAudit[0], audit);
  assert.equal(audit.registros.eventos.length, 1); assert.equal(result.revision, '1'); assert.equal(result.deleted.completas, 0);
});

test('recreated email with a different password gets its own audit identity', async () => {
  const f = fixture(); await remove(f); const id = f.state.emailDeletionAudit[0].id;
  f.state.inventario.push({ id: 4, correo: 'test@example.com', clave: 'new-key', plataformas: { id: 2, nombre: 'Netflix' } });
  await remove(f);
  assert.equal(f.state.emailDeletionAudit.length, 7); assert.equal(f.state.emailDeletionAudit[0].id, id);
  assert.equal(f.state.emailDeletionAudit[0].registros.eventos.length, 1);
  assert.ok(f.state.emailDeletionAudit.some(row => row.clave === 'new-key'));
  assert.equal(f.state.accountDataRevision[0].revision, 2n);
});

for (const failure of ['emailDeletionAudit.upsert', 'cuentascompartidas.deleteMany', 'cuentascompletas.deleteMany', 'inventario.deleteMany', 'usuarios.deleteMany', 'metricasmensuales.deleteMany']) {
  test(`rollback preserves all records, audit and revision on ${failure} failure`, async () => {
    const f = fixture(); const before = structuredClone(f.state); f.fail(failure);
    await assert.rejects(remove(f), /Injected failure/); assert.deepEqual(f.state, before);
  });
}

test('multi-email batch rolls back the first deletion if the next fails', async () => {
  const f = fixture(); const before = structuredClone(f.state);
  f.db.$transaction = (work, options) => f.originalTransaction(async tx => {
    const deletion = tx.inventario.deleteMany; let calls = 0;
    tx.inventario.deleteMany = async args => { if (++calls === 2) throw Error('Second email failed'); return deletion(args); };
    return work(tx);
  }, options);
  await assert.rejects(deleteEmails(f.db, { correos: ['test@example.com', 'other@example.com'], adminId: 1 }), /Second email failed/);
  assert.deepEqual(f.state, before);
});

test('serialization conflicts retry; repeated conflicts stop without partial changes', async () => {
  const f = fixture(); f.conflicts(2); await remove(f); assert.equal(f.options.length, 3); assert.equal(f.state.emailDeletionAudit.length, 6);
  const blocked = fixture(); const before = structuredClone(blocked.state); blocked.conflicts(10);
  await assert.rejects(remove(blocked), /Deadlock/); assert.equal(blocked.options.length, 4); assert.deepEqual(blocked.state, before);
});

test('unknown emails do not fabricate audits; missing admin cannot delete', async () => {
  const f = fixture(); await deleteEmails(f.db, { correos: ['missing@example.com'], adminId: 1 });
  assert.equal(f.state.emailDeletionAudit.length, 0); assert.equal(f.state.metricasmensuales.length, 1);
  const before = structuredClone(f.state);
  await assert.rejects(deleteEmails(f.db, { correos: ['test@example.com'], adminId: 99 }), /unauthorized/); assert.deepEqual(f.state, before);
});

test('same email and exact password has one audit across platforms and repeated deletions', async () => {
  const f = fixture();
  for (const row of f.state.cuentascompletas) if (row.correo.toLowerCase().includes('test@')) row.contrasena = 'shared-key';
  await remove(f);
  const audit = f.state.emailDeletionAudit.find(row => row.clave === 'shared-key');
  assert.deepEqual(audit.plataformas.map(row => row.id).sort(), [1, 2]);
  f.state.cuentascompletas.push({ id: 99n, correo: ' TEST@example.com ', contrasena: 'shared-key', contacto: 'again', plataformas: { id: 1, nombre: 'MAX' }, plataforma_id: 1 });
  await remove(f);
  assert.equal(f.state.emailDeletionAudit.filter(row => row.clave === 'shared-key').length, 1);
  assert.equal(f.state.emailDeletionAudit.find(row => row.clave === 'shared-key').registros.eventos.length, 2);
  assert.notEqual(auditIdentity('test@example.com', 'Key'), auditIdentity('test@example.com', 'key'));
  assert.notEqual(auditIdentity('test@example.com', 'key '), auditIdentity('test@example.com', 'key'));
});

test('last expired record is preserved in inventory without auditing its email/password', async () => {
  const f = fixture();
  const result = await deleteEmails(f.db, { expiredTargets: [{ tipo: 'pantalla', id: '1' }], adminId: 1 });
  assert.equal(result.revision, '1');
  assert.equal(f.state.pantallas.some(row => row.id === 1), false);
  assert.equal(f.state.cuentascompartidas.some(row => row.correo.trim().toLowerCase() === 'test@example.com'), false);
  assert.equal(f.state.cuentascompletas.some(row => row.correo.trim().toLowerCase() === 'test@example.com'), false);
  assert.ok(f.state.inventario.some(row => row.correo === 'test@example.com' && row.clave === 'shared-key'));
  assert.equal(f.state.emailDeletionAudit.some(row => row.clave === 'shared-key'), false);
  assert.equal(f.state.deletedAccountHistory.length, 0);
});

test('selection containing every remaining screen preserves inventory even when none was initially last', async () => {
  const f = fixture();
  f.state.pantallas.push({ id: 4, cuenta_id: 1, contacto: 'only-screen' });
  await deleteEmails(f.db, { expiredTargets: [{ tipo: 'pantalla', id: '1' }, { tipo: 'pantalla', id: '4' }], adminId: 1 });
  assert.ok(f.state.inventario.some(row => row.correo === 'test@example.com' && row.clave === 'shared-key'));
  assert.equal(f.state.emailDeletionAudit.some(row => row.clave === 'shared-key'), false);
});

test('non-last expired record deletes every email relation and audits definitively', async () => {
  const f = fixture();
  f.state.pantallas.push({ id: 4, cuenta_id: 1, contacto: 'only-screen' });
  await deleteEmails(f.db, { expiredTargets: [{ tipo: 'pantalla', id: '1' }], adminId: 1 });
  assert.equal(f.state.inventario.some(row => row.correo.trim().toLowerCase() === 'test@example.com'), false);
  assert.ok(f.state.emailDeletionAudit.some(row => row.clave === 'shared-key'));
});

test('inventory transfer failure rolls back deletion, audits, metrics and revision', async () => {
  const f = fixture(); const before = structuredClone(f.state); f.fail('inventario.upsert');
  await assert.rejects(deleteEmails(f.db, { expiredTargets: [{ tipo: 'pantalla', id: '1' }], adminId: 1 }), /Injected failure/);
  assert.deepEqual(f.state, before);
});

test('email SQL matches use bound parameters rather than interpolated text', async () => {
  const f = fixture(); await deleteEmails(f.db, { correos: ["o'brien@example.com"], adminId: 1 });
  for (const query of f.queries) { assert.deepEqual(query.values, ["o'brien@example.com"]); assert.ok(!query.strings.join('').includes("o'brien")); assert.match(query.strings.join(''), /FOR UPDATE/); }
});

test('audit filters search all keys, platforms and inclusive Bogotá date ranges', () => {
  const result = deletionAuditFilters(new URLSearchParams({ correo: ' TEST@', clave: 'full-key', plataforma: '2', desde: '2026-10-01', hasta: '2026-10-04', order: 'asc', page: '2' }));
  assert.deepEqual(result.where.correo, { contains: 'test@' }); assert.deepEqual(result.where.claves, { contains: 'full-key' });
  assert.deepEqual(result.where.plataformas, { array_contains: [{ id: 2 }] });
  assert.equal(result.where.fechaEliminacion.gte.toISOString(), '2026-10-01T05:00:00.000Z'); assert.equal(result.where.fechaEliminacion.lt.toISOString(), '2026-10-05T05:00:00.000Z');
  assert.equal(result.page, 2); assert.equal(result.order, 'asc');
  for (const params of [{ desde: '2026-02-30' }, { desde: '2026-10-05', hasta: '2026-10-04' }, { plataforma: '-1' }, { page: '0' }, { order: 'SQL' }]) assert.throws(() => deletionAuditFilters(new URLSearchParams(params)));
});

// Load actual Next route handlers with database/session adapters instead of a MySQL server.
const Module = require('node:module');
const path = require('node:path');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request.startsWith('@/lib/')) request = path.join(__dirname, '../lib', request.slice(6));
  if (request === '@generated/prisma') request = path.join(__dirname, '../src/generated/prisma');
  return originalResolve.call(this, request, ...args);
};
let routeFixture; let sessionId = 1;
require.cache[require.resolve('../lib/db.ts')] = { exports: { prisma: new Proxy({}, { get: (_target, key) => routeFixture.db[key] }) } };
require.cache[require.resolve('../lib/adminSession.ts')] = { exports: { getAuthenticatedAdminId: async () => sessionId } };
const batchRoute = require('../src/app/api/account-deletions/route.ts');
const expiredRoute = require('../src/app/api/cuentasvencidas/delete/route.ts');
const routes = ['pantallas', 'cuentascompletas', 'cuentascompartidas', 'inventario'].map(name => ({ name, route: require(`../src/app/api/${name}/[id]/route.ts`) }));

for (const { name, route } of routes) {
  test(`DELETE /api/${name}/[id] runs global deletion and does not duplicate its audit on retry`, async () => {
    routeFixture = fixture(); sessionId = 1;
    const id = name === 'cuentascompletas' ? '10' : '1';
    const request = () => new Request(`http://localhost/api/${name}/${id}`, { method: 'DELETE' });
    const context = () => ({ params: Promise.resolve({ id }) });
    const response = await route.DELETE(request(), context());
    assert.equal(response.status, 200);
    const json = await response.json(); assert.equal(json.deleted.pantallas, 2); assert.equal(json.deleted.completas, 2);
    assert.equal(routeFixture.state.emailDeletionAudit.length, 6);
    assert.equal((await route.DELETE(request(), context())).status, 200);
    assert.equal(routeFixture.state.emailDeletionAudit.length, 6); assert.equal(routeFixture.state.emailDeletionAudit[0].registros.eventos.length, 1);
  });
}

test('batch endpoint rejects unauthenticated requests, invalid emails and oversized requests', async () => {
  routeFixture = fixture(); const before = structuredClone(routeFixture.state);
  const request = data => new Request('http://localhost/api/account-deletions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  sessionId = null; assert.equal((await batchRoute.DELETE(request({ correos: ['test@example.com'] }))).status, 401);
  sessionId = 1;
  for (const data of [{ correos: [] }, { correos: ['invalid'] }, { correos: Array(101).fill('test@example.com') }, { correos: ['test@example.com'], motivo: 'a'.repeat(2001) }]) assert.equal((await batchRoute.DELETE(request(data))).status, 400);
  assert.deepEqual(routeFixture.state, before);
});

test('batch endpoint performs deletion and records its reason through the actual handler', async () => {
  routeFixture = fixture(); sessionId = 1;
  const response = await batchRoute.DELETE(new Request('http://localhost/api/account-deletions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correos: ['test@example.com'], motivo: 'Retirada manual' }) }));
  assert.equal(response.status, 200); assert.equal(routeFixture.state.emailDeletionAudit[0].motivo, 'Retirada manual');
});

test('expired endpoint authenticates, validates targets and preserves the last complete account', async () => {
  routeFixture = fixture();
  const request = data => new Request('http://localhost/api/cuentasvencidas/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  sessionId = null;
  assert.equal((await expiredRoute.DELETE(request({ targets: [{ tipo: 'completa', id: '10' }] }))).status, 401);
  sessionId = 1;
  for (const data of [{ targets: [] }, { targets: [{ tipo: 'inventario', id: '1' }] }, { targets: [{ tipo: 'pantalla', id: '2147483648' }] }, { targets: [{ tipo: 'completa', id: '18446744073709551616' }] }]) assert.equal((await expiredRoute.DELETE(request(data))).status, 400);
  routeFixture.state.cuentascompletas[0].fecha_vencimiento = new Date('2020-01-01');
  const response = await expiredRoute.DELETE(request({ targets: [{ tipo: 'completa', id: '10' }], motivo: 'Vencida', expected: { correo: 'TEST@example.com', clave: 'full-key', plataformaId: 2, confirmado: true } }));
  assert.equal(response.status, 200);
  assert.ok(routeFixture.state.inventario.some(row => row.clave === 'full-key'));
  assert.equal(routeFixture.state.emailDeletionAudit.some(row => row.clave === 'full-key'), false);
});

test('legacy audit is claimed without duplicating the same pair or losing its original snapshots', async () => {
  const f = fixture(); await remove(f);
  const existing = f.state.emailDeletionAudit.find(row => row.clave === 'full-key');
  existing.dedupeKey = null;
  f.state.cuentascompletas.push({ id: 99n, correo: 'test@example.com', contrasena: 'full-key', contacto: 'again', plataformas: { id: 2, nombre: 'Netflix' }, plataforma_id: 2 });
  await remove(f);
  const records = f.state.emailDeletionAudit.filter(row => row.clave === 'full-key');
  assert.equal(records.length, 1); assert.equal(records[0].id, existing.id);
  assert.equal(records[0].registros.eventos.length, 2);
  assert.equal(records[0].dedupeKey, auditIdentity('test@example.com', 'full-key'));
});

test('inventory consumption uses scope=record and preserves the sold accounts', async () => {
  routeFixture = fixture(); sessionId = 1;
  const route = routes.find(row => row.name === 'inventario').route;
  const response = await route.DELETE(new Request('http://localhost/api/inventario/1?scope=record', { method: 'DELETE' }), { params: Promise.resolve({ id: '1' }) });
  assert.equal(response.status, 200);
  assert.equal(routeFixture.state.cuentascompletas.length, 3); assert.equal(routeFixture.state.pantallas.length, 3);
  assert.equal(routeFixture.state.inventario.length, 2); assert.equal(routeFixture.state.emailDeletionAudit.length, 0);
});

test('Admin audit endpoint enforces authentication and exposes one searchable audit and its original details', async () => {
  routeFixture = fixture(); sessionId = 1; await remove(routeFixture);
  const route = require('../src/app/api/admin/deletions/route.ts');
  sessionId = null; assert.equal((await route.GET(new Request('http://localhost/api/admin/deletions'))).status, 401);
  sessionId = 1;
  const response = await route.GET(new Request('http://localhost/api/admin/deletions?correo=test&clave=inventory-key-2&plataforma=2'));
  const result = await response.json(); assert.equal(response.status, 200); assert.equal(result.total, 1); assert.equal(result.items[0].correo, 'test@example.com');
  const detail = await (await route.GET(new Request(`http://localhost/api/admin/deletions?id=${result.items[0].id}`))).json();
  assert.equal(detail.item.registros.eventos[0].pantallas.length, 0); assert.equal(detail.item.eliminadoPor, 'auditor');
  const facets = await (await route.GET(new Request('http://localhost/api/admin/deletions?facets=platforms'))).json();
  assert.deepEqual(facets.plataformas, [{ id: 1, nombre: 'MAX' }, { id: 2, nombre: 'Netflix' }]); // No live catalog model exists in this adapter: historical names remain available.
  assert.equal((await route.GET(new Request('http://localhost/api/admin/deletions?desde=2026-02-30'))).status, 400);
  assert.equal((await route.GET(new Request('http://localhost/api/admin/deletions?id=999'))).status, 404);
});

test('revision endpoint reports committed deletions to other devices and no duplicates after that revision', async () => {
  routeFixture = fixture(); sessionId = 1; await remove(routeFixture);
  const route = require('../src/app/api/account-data-revision/route.ts');
  const result = await (await route.GET(new Request('http://localhost/api/account-data-revision?since=0'))).json();
  assert.deepEqual(result, { revision: '1', correos: ['test@example.com'] });
  assert.deepEqual(await (await route.GET(new Request('http://localhost/api/account-data-revision?since=1'))).json(), { revision: '1', correos: [] });
  assert.equal((await route.GET(new Request('http://localhost/api/account-data-revision?since=-1'))).status, 400);
  sessionId = null; assert.equal((await route.GET(new Request('http://localhost/api/account-data-revision'))).status, 401); sessionId = 1;
});


test('disabled platforms still delete globally and advance revision without creating audits', async () => {
  const f = fixture();
  for (const table of ['cuentascompartidas', 'cuentascompletas', 'inventario']) for (const row of f.state[table]) row.plataformas.auditarEliminaciones = false;
  const result = await remove(f);
  assert.equal(result.deleted.pantallas, 2); assert.equal(result.deleted.completas, 2);
  assert.deepEqual(result.audits, []); assert.equal(f.state.emailDeletionAudit.length, 0);
  assert.equal(result.revision, '1'); assert.equal(f.state.metricasmensuales.length, 0);
});

test('mixed enabled and disabled platforms with the same credentials only snapshot enabled records', async () => {
  const f = fixture();
  for (const table of ['cuentascompartidas', 'cuentascompletas', 'inventario']) for (const row of f.state[table]) {
    if (row.correo.trim().toLowerCase() !== 'test@example.com') continue;
    row.plataformas.auditarEliminaciones = row.plataforma_id === 1;
    if ('contrasena' in row) row.contrasena = 'same'; else row.clave = 'same';
  }
  const result = await remove(f);
  assert.equal(result.deleted.completas, 2); assert.equal(f.state.emailDeletionAudit.length, 1);
  const audit = f.state.emailDeletionAudit[0], event = audit.registros.eventos[0];
  assert.deepEqual(audit.plataformas.map(row => row.id), [1]);
  assert.ok([...event.cuentascompartidas, ...event.cuentascompletas, ...event.inventario].every(row => row.plataforma_id === 1));
  assert.deepEqual(event.pantallas.map(row => row.id), [1]);
  assert.ok(!event.usuarios.some(row => row.contacto === 'only-full'));
  assert.ok(!audit.contactos.includes('only-full'));
});

test('disabled audit leaves the last-record inventory rule intact', async () => {
  const f = fixture();
  for (const table of ['cuentascompartidas', 'cuentascompletas', 'inventario']) for (const row of f.state[table]) row.plataformas.auditarEliminaciones = false;
  const result = await deleteEmails(f.db, { adminId: 1, expiredTargets: [{ tipo: 'completa', id: '10' }] });
  assert.ok(f.state.inventario.some(row => row.correo === 'test@example.com' && row.plataforma_id === 2 && row.clave === 'full-key'));
  assert.deepEqual(result.audits, []); assert.equal(result.deleted.completas, 2);
});

test('expired endpoint forwards explicit definitive choice and rejects unknown destinations', async () => {
  routeFixture = fixture(); sessionId = 1;
  routeFixture.state.cuentascompletas[0].fecha_vencimiento = new Date('2020-01-01');
  const request = destino => new Request('http://localhost/api/cuentasvencidas/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targets: [{ tipo: 'completa', id: '10' }], destino, expected: { correo: 'TEST@example.com', clave: 'full-key', plataformaId: 2, confirmado: true } }) });
  assert.equal((await expiredRoute.DELETE(request('unknown'))).status, 400);
  assert.equal((await expiredRoute.DELETE(request('eliminar'))).status, 200);
  assert.equal(routeFixture.state.inventario.filter(row => row.correo.trim().toLowerCase() === 'test@example.com').length, 2);
  assert.equal(routeFixture.state.cuentascompletas.length, 2); assert.equal(routeFixture.state.pantallas.length, 3);
  assert.ok(routeFixture.state.emailDeletionAudit.some(row => row.clave === 'full-key'));
});

test('backend blocks active assignments, bypassed confirmation, mixed batches and stale identities without mutation', async () => {
  routeFixture = fixture(); sessionId = 1;
  const req = data => new Request('http://localhost/api/cuentasvencidas/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const confirmed = { targets: [{ tipo: 'completa', id: '10' }], destino: 'eliminar', expected: { correo: 'TEST@example.com', clave: 'full-key', plataformaId: 2, confirmado: true } };
  let before = structuredClone(routeFixture.state);
  assert.equal((await expiredRoute.DELETE(req(confirmed))).status, 409); assert.deepEqual(routeFixture.state, before);
  routeFixture.state.cuentascompletas[0].fecha_vencimiento = new Date('2020-01-01'); before = structuredClone(routeFixture.state);
  for (const body of [{ ...confirmed, expected: undefined }, { ...confirmed, expected: { ...confirmed.expected, clave: 'changed' } }, { ...confirmed, targets: [...confirmed.targets, { tipo: 'completa', id: '11' }] }]) {
    assert.equal((await expiredRoute.DELETE(req(body))).status, 409); assert.deepEqual(routeFixture.state, before);
  }
});

test('inspection distinguishes selected expired record from active siblings using normalized email', async () => {
  routeFixture = fixture(); sessionId = 1;
  const parent = routeFixture.state.cuentascompartidas[0];
  routeFixture.state.pantallas[0].fecha_vencimiento = '2000-01-01';
  routeFixture.state.pantallas.push({ id: 99, cuenta_id: parent.id, contacto: 'active-client', fecha_vencimiento: '2099-01-01' });
  const response = await expiredRoute.GET(new Request('http://localhost/api/cuentasvencidas/delete?tipo=pantalla&id=1'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.selectedId, '1'); assert.equal(data.selectedType, 'pantalla');
  assert.equal(data.expired, true); assert.equal(data.selectedActive, false);
  assert.equal(data.active, true); assert.equal(data.isLast, false); assert.equal(data.warning, null);
});
