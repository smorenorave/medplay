/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request.startsWith('@/lib/')) request = path.join(__dirname, '../lib', request.slice(6));
  if (request === '@generated/prisma') request = path.join(__dirname, '../src/generated/prisma');
  return resolve.call(this, request, ...args);
};
let platforms = [{ id: 1, nombre: 'Catalog A', auditarEliminaciones: true }, { id: 2, nombre: 'Catalog B', auditarEliminaciones: true }];
let exists = true, writes = 0;
const db = {
  admin: { findUnique: async () => exists ? { id: 1 } : null },
  plataformas: {
    findMany: async () => structuredClone(platforms),
    count: async ({ where }) => platforms.filter(row => where.id.in.includes(row.id)).length,
    updateMany: async ({ where, data }) => { writes++; for (const row of platforms) if (where.id.in.includes(row.id)) Object.assign(row, data); },
  },
  $transaction: async work => { const before = structuredClone(platforms); try { return await work(db); } catch (e) { platforms = before; throw e; } },
};
require.cache[require.resolve('../lib/db.ts')] = { exports: { prisma: db } };
const settings = require('../src/app/api/admin/settings/deletion-audit/route.ts');
const history = require('../src/app/api/admin/deletions/route.ts');
const dashboard = require('../src/app/api/admin/dashboard/route.ts');
const { getAuthenticatedAdminId } = require('../lib/adminSession.ts');
process.env.AUTH_SECRET = 'isolated-admin-settings-test-secret';
async function request(role = 'admin', body, activity = Date.now()) {
  const { SignJWT } = await import('jose');
  const token = await new SignJWT({ role }).setProtectedHeader({ alg: 'HS256' }).setSubject('1').setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  return new Request('http://localhost/api/admin/settings/deletion-audit', { method: body ? 'PUT' : 'GET', headers: { cookie: 'authToken=' + token + '; lastActivity=' + activity, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
test('real JWT rejects non-admin, inactive and deleted admin accounts before settings access', async () => {
  for (const role of ['user', '']) {
    assert.equal(await getAuthenticatedAdminId(await request(role)), null);
    assert.equal((await settings.GET(await request(role))).status, 403);
    assert.equal((await settings.PUT(await request(role, { plataformas: [] }))).status, 403);
    assert.equal((await history.GET(await request(role))).status, 401);
    assert.equal((await dashboard.GET(await request(role))).status, 403);
  }
  assert.equal(await getAuthenticatedAdminId(await request('admin', null, Date.now() - 3600000)), null);
  exists = false; assert.equal((await settings.GET(await request())).status, 403); exists = true;
  assert.equal(writes, 0);
});
test('catalog settings persist through fresh requests and preserve newly added platforms', async () => {
  assert.deepEqual((await (await settings.GET(await request())).json()).plataformas.map(row => row.nombre), ['Catalog A', 'Catalog B']);
  const saved = await settings.PUT(await request('admin', { plataformas: [{ id: 1, habilitada: false }, { id: 2, habilitada: true }] }));
  assert.equal(saved.status, 200);
  assert.equal((await (await settings.GET(await request())).json()).plataformas[0].auditarEliminaciones, false);
  platforms.push({ id: 3, nombre: 'New catalog', auditarEliminaciones: true });
  assert.equal((await settings.PUT(await request('admin', { plataformas: [{ id: 1, habilitada: true }, { id: 2, habilitada: false }] }))).status, 200);
  assert.equal(platforms[2].auditarEliminaciones, true);
});
test('invalid settings and missing platforms cannot partially modify the configuration', async () => {
  const before = structuredClone(platforms);
  for (const body of [{ plataformas: [{ id: 1, habilitada: 'false' }] }, { plataformas: [{ id: 1, habilitada: true }, { id: 1, habilitada: false }] }, { plataformas: [{ id: 2, habilitada: true, nombre: 'Injected' }] }]) assert.equal((await settings.PUT(await request('admin', body))).status, 400);
  assert.equal((await settings.PUT(await request('admin', { plataformas: [{ id: 1, habilitada: false }, { id: 999, habilitada: false }] }))).status, 409);
  assert.deepEqual(platforms, before);
});


test('daily summary keeps operational data while administrative endpoint retains all five metric calculations', async () => {
  db.pantallas = { findMany: async () => [{ total_pagado: 20, total_ganado: 8, cuentascompartidas: { plataforma_id: 1 } }], aggregate: async () => ({ _count: { _all: 1 }, _sum: { total_ganado: 8 } }), count: async () => 3 };
  db.cuentascompletas = { findMany: async () => [{ total_pagado_completa: 50, total_ganado: 15, plataforma_id: 2 }], aggregate: async () => ({ _count: { _all: 1 }, _sum: { total_ganado: 15 } }), count: async () => 2 };
  db.inventario = { groupBy: async () => [{ plataforma_id: 1, _count: { _all: 2 } }] };
  const operational = require('../src/app/api/dashboard/route.ts');
  const daily = await (await operational.GET()).json();
  const full = await (await dashboard.GET(await request())).json();
  assert.equal(full.salesToday, 2); assert.equal(full.salesMonth, 2);
  assert.equal(full.profitToday, 23); assert.equal(full.profitMonth, 23); assert.equal(full.revenueMonth, 70);
  for (const key of ['profitToday', 'salesMonth', 'revenueMonth', 'profitMonth']) assert.ok(!(key in daily));
  for (const key of ['salesToday', 'activeScreens', 'expiringSoon', 'pendingAttention', 'topServices', 'lowStock', 'stockRotation', 'businessDate']) assert.deepEqual(daily[key], full[key]);
});

test('failed catalog reads and saves return JSON instead of an empty server response', async () => {
  const original = db.plataformas.findMany;
  db.plataformas.findMany = async () => { throw Object.assign(new Error('Missing column'), { code: 'P2022' }); };
  try {
    for (const response of [await settings.GET(await request()), await settings.PUT(await request('admin', { plataformas: [] }))]) {
      assert.equal(response.status, 500);
      assert.match(response.headers.get('Content-Type'), /application\/json/);
      assert.match((await response.json()).error, /migraciones/);
    }
  } finally { db.plataformas.findMany = original; }
});
