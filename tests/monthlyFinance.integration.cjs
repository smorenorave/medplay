/* eslint-disable @typescript-eslint/no-require-imports -- Node integration runner loads TS through ts-node. */
/* Real MySQL/MariaDB integration test; creates only a new, explicitly named test database. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const Module = require('node:module');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request.startsWith('@/lib/')) request = path.resolve('lib', request.slice(6));
  return originalResolve.call(this, request, ...args);
};
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });

test('permanent monthly finance: real persistence, closing, recovery, concurrency and exports', async t => {
  assert.ok(process.env.FINANCE_TEST_SERVER_URL, 'Set FINANCE_TEST_SERVER_URL to an isolated SQL test server');
  const serverUrl = new URL(process.env.FINANCE_TEST_SERVER_URL);
  assert.equal(serverUrl.hostname, '127.0.0.1', 'Only the local isolated server is permitted');
  assert.equal(serverUrl.port, '3318', 'Dedicated finance test port required');
  const database = `medplay_finance_test_${Date.now()}`;
  const c = await mysql.createConnection({ host: serverUrl.hostname, port: Number(serverUrl.port), user: decodeURIComponent(serverUrl.username), password: decodeURIComponent(serverUrl.password), multipleStatements: true });
  await c.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await c.query(`USE \`${database}\``);
  serverUrl.pathname = '/' + database;
  process.env.DATABASE_URL = serverUrl.toString();
  const { prisma } = require('../lib/db.ts');
  const dates = require('../lib/bogotaDate.ts');
  const originalToday = dates.todayYMDBogota;
  const finance = require('../lib/monthlySnapshots.ts');
  const read = async sql => (await c.query(sql))[0];
  const migrationDirs = fs.readdirSync('prisma/migrations').sort();
  try {
    for (const dir of migrationDirs) {
      if (dir === '20261102000000_permanent_monthly_finance') {
        await c.query("INSERT INTO metricasmensuales (year,month,periodLabel,totalGeneral,totalPantallas,totalCuentas,ventasCantidad,clientesActivos,ranking,ventasDias,updatedAt) VALUES (2001,1,'2001-01',123,123,0,1,1,'[]','[]',NOW())");
      }
      const sql = fs.readFileSync(path.join('prisma/migrations', dir, 'migration.sql'), 'utf8');
      await c.query(sql);
    }
    await t.test('migration installs ledger and immutable guards, without inventing prior months', async () => {
      assert.equal((await read('SELECT * FROM financialSale')).length, 0);
      await assert.rejects(finance.ensureMonthlySnapshot(2026, 7), finance.MissingHistoricalSnapshot);
      await assert.rejects(finance.generateMonthlySnapshot(2026, 7), finance.MissingHistoricalSnapshot);
      assert.equal((await read('SELECT * FROM metricasmensuales')).length, 1);
      assert.equal(String((await read("SELECT * FROM metricasmensuales WHERE periodLabel='2001-01'"))[0].totalGeneral), '123.00');
    });
    const coverage = (await read('SELECT * FROM financialCoverage'))[0].firstCompleteMonth;
    const [year, month] = coverage.split('-').map(Number);
    const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
    const after = new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 7);
    await c.query("INSERT INTO usuarios (contacto,nombre) VALUES ('test-contact','Test'); INSERT INTO plataformas (nombre) VALUES ('Test platform'); INSERT INTO cuentascompartidas (correo,contrasena,plataforma_id) VALUES ('test@example.test','test',1)");
    await t.test('sales capture is atomic, revenue differs from profit, and live totals refresh', async () => {
      await c.query(`INSERT INTO pantallas (cuenta_id,contacto,nro_pantalla,fecha_compra,fecha_vencimiento,estado,total_pagado,total_pagado_proveedor,total_ganado) VALUES (1,'test-contact','1','${coverage}-05','${next}-05','ACTIVA',20000,7000,13000)`);
      dates.todayYMDBogota = () => `${coverage}-20`;
      const live = finance.serializeMonthlySnapshot(await finance.ensureMonthlySnapshot(year, month));
      assert.equal(live.source, 'live'); assert.equal(live.total_general, 20000); assert.equal(live.ganancia_neta, 13000);
      assert.equal(live.costos, 7000); assert.equal(live.clientes_activos, 1);
      assert.equal((await read('SELECT * FROM metricasmensuales')).length, 1);
      await c.beginTransaction();
      await c.query(`INSERT INTO cuentascompletas (contacto,plataforma_id,correo,contrasena,fecha_compra,fecha_vencimiento,total_pagado_completa) VALUES ('test-contact',1,'rollback@example.test','test','${coverage}-06','${next}-06',9000)`);
      await c.rollback();
      assert.equal((await read('SELECT * FROM financialSale')).length, 1);
    });
    await t.test('incomplete transaction rolls back and the next run retries successfully', async () => {
      dates.todayYMDBogota = () => `${next}-03`;
      const original = prisma.$transaction;
      prisma.$transaction = (work, options) => original.call(prisma, tx => work(new Proxy(tx, { get(target, key) {
        if (key === 'metricasmensuales') return new Proxy(target.metricasmensuales, { get(model, method) {
          if (method === 'create') return async () => { throw Error('Injected interrupted close'); };
          return model[method];
        } });
        return target[key];
      } })), options);
      try { await assert.rejects(finance.refreshAutomaticSnapshots(), /Injected interrupted close/); }
      finally { prisma.$transaction = original; }
      assert.equal((await read('SELECT * FROM metricasmensuales')).length, 1);
      assert.equal((await read("SELECT * FROM monthlyCloseLog WHERE status='failed'")).length, 2);
    });
    await t.test('startup catch-up closes without a page, concurrent invocations never duplicate', async () => {
      dates.todayYMDBogota = () => `${next}-03`;
      await Promise.all([finance.refreshAutomaticSnapshots(), finance.refreshAutomaticSnapshots()]);
      const rows = await read('SELECT * FROM metricasmensuales');
      assert.equal(rows.length, 2); assert.equal(String(rows.find(r => r.periodLabel === coverage).totalGeneral), '20000.00');
      assert.equal((await read("SELECT * FROM monthlyCloseLog WHERE status='closed'")).length, 1);
    });
    await t.test('renewals, account deletion and foreign-key cascades cannot change closed finances', async () => {
      await c.query(`UPDATE pantallas SET fecha_compra='${next}-03',fecha_vencimiento='${after}-03',total_pagado=25000,total_pagado_proveedor=8000 WHERE id=1`);
      await c.query("DELETE FROM cuentascompartidas WHERE id=1");
      assert.equal((await read('SELECT * FROM pantallas')).length, 0);
      assert.equal((await read('SELECT * FROM financialSale')).length, 2);
      const closed = finance.serializeMonthlySnapshot(await finance.ensureMonthlySnapshot(year, month));
      assert.equal(closed.total_general, 20000); assert.equal(closed.ventas_cantidad, 1);
      assert.equal(closed.ventas_dias.reduce((n, d) => n + d.total, 0), 20000);
      assert.equal(closed.ranking[0].total, 20000);
      await assert.rejects(c.query('DELETE FROM metricasmensuales'));
      await assert.rejects(c.query('UPDATE metricasmensuales SET totalGeneral=0'));
      await assert.rejects(c.query('DELETE FROM financialSale'));
    });
    await t.test('catch-up after interruption fills all covered months and records results', async () => {
      const [ny, nm] = next.split('-').map(Number);
      // Simulate an old future-month cache. Its original row must be preserved.
      await c.query("INSERT INTO metricasmensuales (year,month,periodLabel,totalGeneral,totalPantallas,totalCuentas,ventasCantidad,clientesActivos,ranking,ventasDias,updatedAt) VALUES (?,?,?,0,0,0,0,0,'[]','[]',NOW())", [ny, nm, next]);
      await c.query("INSERT INTO monthlyCloseLog (periodLabel,status,result) VALUES (?,'unclosed_legacy','test cache')", [next]);
      dates.todayYMDBogota = () => `${after}-10`;
      await assert.rejects(finance.ensureMonthlySnapshot(ny, nm), finance.MissingHistoricalSnapshot);
      dates.todayYMDBogota = () => `${after}-10`;
      await finance.refreshAutomaticSnapshots();
      await finance.refreshAutomaticSnapshots();
      assert.equal((await read('SELECT * FROM metricasmensuales')).length, 3);
      assert.equal(finance.serializeMonthlySnapshot(await finance.ensureMonthlySnapshot(ny, nm)).total_general, 25000);
      assert.equal(String((await read(`SELECT totalGeneral FROM metricasmensuales WHERE periodLabel='${next}'`))[0].totalGeneral), '0.00', 'Original cache is preserved, final close is a separate revision');
    });
    await t.test('CSV, XLSX and annual API all use persisted period data', async () => {
      const { GET, POST } = require('../src/app/api/metricas-mensuales/route.ts');
      const { NextRequest } = require('next/server');
      assert.equal((await GET(new NextRequest('http://localhost/api/metricas-mensuales?year=2026&month=7'))).status, 403);
      process.env.AUTH_SECRET = 'finance-integration-isolated-secret';
      await c.query("INSERT INTO admin (usuario,contrasena) VALUES ('finance-test','unused')");
      const { SignJWT } = await import('jose');
      const token = await new SignJWT({ role: 'admin' }).setSubject('1').setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET));
      const request = url => new NextRequest(url, { headers: { cookie: `authToken=${token}; lastActivity=${Date.now()}` } });
      const base = `http://localhost/api/metricas-mensuales?year=${year}&month=${month}`;
      const csv = await GET(request(base + '&format=csv'));
      assert.equal(csv.status, 200);
      const text = await csv.text(); assert.match(text, /20000/); assert.match(text, /7000/); assert.match(text, /Test platform/); assert.doesNotMatch(text, /25000/);
      const xlsx = await GET(request(base + '&format=xlsx'));
      const ExcelJS = require('exceljs'); const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(await xlsx.arrayBuffer()));
      assert.equal(wb.getWorksheet('KPIs').getCell('B3').value, 20000);
      assert.equal(wb.getWorksheet('Ranking').getCell('C2').value, 20000);
      assert.equal(wb.getWorksheet('Registros').getCell('E2').value, 20000);
      const annual = await (await GET(request(`http://localhost/api/metricas-mensuales?year=${year}&annual=1`))).json();
      assert.ok(annual.months.length > 0);
      assert.equal((await POST()).status, 405);
    });
    await t.test('controlled recovery/correction preserves original and audits evidence and concurrency', async () => {
      const { reviseVerifiedSnapshot } = require('../lib/monthlySnapshotRevisions.ts');
      const row = await finance.ensureMonthlySnapshot(year, month);
      const replacement = { ...row, totalGeneral: 20000, totalPantallas: 20000, totalCuentas: 0 };
      await reviseVerifiedSnapshot(replacement, 'test-operator', 'Verified correction test', 'Isolated transaction evidence', '0');
      await assert.rejects(reviseVerifiedSnapshot(replacement, 'test-operator', 'Stale correction test', 'Isolated transaction evidence', '0'), /revisión cambió/);
      assert.equal((await read('SELECT * FROM monthlySnapshotRevision')).length, 2);
      assert.equal(finance.serializeMonthlySnapshot(await finance.ensureMonthlySnapshot(year, month)).provenance, 'verified-recovery');
      assert.equal((await read('SELECT * FROM metricasmensuales')).length, 3);
    });
    console.log(`Verified real persistent records in isolated database ${database}`);
  } finally {
    dates.todayYMDBogota = originalToday;
    await prisma.$disconnect(); await c.end();
  }
});

test('Prisma deploy applies the full migration chain including finance triggers', async () => {
  const url = new URL(process.env.FINANCE_TEST_SERVER_URL);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '3318');
  const c = await mysql.createConnection({ host: url.hostname, port: 3318, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) });
  const database = `medplay_finance_test_deploy_${Date.now()}`;
  try {
    await c.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    url.pathname = '/' + database;
    const result = await promisify(execFile)(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url.toString() }, windowsHide: true, timeout: 60000 });
    assert.match(result.stdout, /successfully applied|No pending migrations/);
    const [triggers] = await c.query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?', [database]);
    assert.ok(triggers.some(r => r.TRIGGER_NAME === 'protect_metricasmensuales_delete'));
    assert.ok(triggers.some(r => r.TRIGGER_NAME === 'finance_C_insert'));
    await c.query(`USE \`${database}\``);
    await c.query("INSERT INTO usuarios (contacto) VALUES ('rounding-test')");
    await c.query("INSERT INTO plataformas (nombre) VALUES ('Rounding platform')");
    await c.query("INSERT INTO cuentascompletas (id,contacto,plataforma_id,correo,contrasena,fecha_compra,fecha_vencimiento,total_pagado_completa,total_pagado_proveedor_completa) VALUES (1,'rounding-test',1,'test@example.test','test',DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00')),DATE_ADD(UTC_DATE(),INTERVAL 1 MONTH),0.10,0.03)");
    await c.query('UPDATE cuentascompletas SET total_pagado_completa=0.30,total_pagado_proveedor_completa=0.10 WHERE id=1');
    let [totals] = await c.query('SELECT SUM(ingreso) ingreso,SUM(costo) costo,SUM(unidades) unidades FROM financialSale');
    assert.equal(String(totals[0].ingreso), '0.30'); assert.equal(String(totals[0].costo), '0.10'); assert.equal(Number(totals[0].unidades), 1);
    await c.query('DELETE FROM cuentascompletas WHERE id=1');
    await c.query("INSERT INTO cuentascompletas (id,contacto,plataforma_id,correo,contrasena,fecha_compra,fecha_vencimiento,total_pagado_completa,total_pagado_proveedor_completa) VALUES (1,'rounding-test',1,'test@example.test','test',DATE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00')),DATE_ADD(UTC_DATE(),INTERVAL 1 MONTH),0.30,0.10)");
    [totals] = await c.query('SELECT SUM(ingreso) ingreso,SUM(unidades) unidades FROM financialSale');
    assert.equal(String(totals[0].ingreso), '0.30'); assert.equal(Number(totals[0].unidades), 1, 'Restoration must not duplicate a sale');
  } finally { await c.end(); }
});
