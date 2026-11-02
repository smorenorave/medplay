/* eslint-disable @typescript-eslint/no-require-imports -- Isolated local Playwright regression. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const mysql = require('mysql2/promise');
const { chromium } = require('playwright');

async function main() {
  const url = new URL(process.env.FINANCE_UI_DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '3318');
  assert.match(url.pathname, /^\/medplay_finance_test_\d+$/);
  const c = await mysql.createConnection(url.toString());
  let server, browser;
  const log = fs.openSync('.logs/finance-test/ui-server.log', 'a');
  try {
    const [admins] = await c.query('SELECT id FROM admin ORDER BY id LIMIT 1');
    assert.ok(admins[0], 'Run the SQL integration test first');
    const days = Array.from({ length: 30 }, (_, i) => ({ day: String(i + 1).padStart(2, '0'), total: i === 4 ? 100 : 0, pantallas: i === 4 ? 60 : 0, completas: i === 4 ? 40 : 0 }));
    const [existing] = await c.query('SELECT id FROM metricasmensuales WHERE year=2025 AND month=9');
    if (!existing.length) await c.query('INSERT INTO metricasmensuales (year,month,periodLabel,totalGeneral,totalPantallas,totalCuentas,ventasCantidad,pantallasVendidas,cuentasVendidas,clientesActivos,ranking,ventasDias,payload,updatedAt) VALUES (2025,9,?,100,60,40,2,1,1,2,?,?,?,NOW())', [
      '2025-09', JSON.stringify([{ name: 'Synthetic UI platform', pid: 1, count: 2, total: 100 }]), JSON.stringify(days),
      JSON.stringify({ generatedBy: 'permanent-ledger', costos: 30, ganancia_neta: 70, registros: [{ id: 'ui1', tipo: 'P', fecha: '2025-09-05', plataforma: 'Synthetic UI platform', ingreso: 60, costo: 20, unidades: 1 }, { id: 'ui2', tipo: 'C', fecha: '2025-09-05', plataforma: 'Synthetic UI platform', ingreso: 40, costo: 10, unidades: 1 }] }),
    ]);
    const secret = 'finance-local-browser-test-secret';
    server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '3319', '-H', '127.0.0.1'], {
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: url.toString(), AUTH_SECRET: secret, MEDPLAY_NEXT_DIST_DIR: '.logs/finance-build-verified' },
      windowsHide: true, stdio: ['ignore', log, log],
    });
    const deadline = Date.now() + 30000;
    while (true) {
      try { if ((await fetch('http://127.0.0.1:3319')).ok) break; } catch {}
      if (Date.now() > deadline) throw Error('Local UI server did not start');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    const { SignJWT } = await import('jose');
    const token = await new SignJWT({ role: 'admin' }).setSubject(String(admins[0].id)).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: 'dark' });
    await context.addCookies([
      { name: 'authToken', value: token, url: 'http://127.0.0.1:3319' },
      { name: 'lastActivity', value: String(Date.now()), url: 'http://127.0.0.1:3319' },
    ]);
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3319/admin');
    await page.getByRole('status').filter({ hasText: 'Datos en vivo' }).waitFor();
    await page.getByRole('heading', { name: 'Panel de Resumen', exact: true }).waitFor();
    await page.getByLabel('Año', { exact: true }).selectOption('2025');
    await page.getByLabel('Mes', { exact: true }).selectOption('9');
    await page.getByRole('status').filter({ hasText: 'Snapshot histórico guardado' }).waitFor();
    await page.getByRole('cell', { name: 'Synthetic UI platform' }).waitFor();
    assert.equal(await page.getByRole('cell', { name: '$ 100', exact: true }).count(), 1);
    await page.locator('svg.recharts-surface').first().waitFor();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV', exact: true }).click();
    const csv = await download; const output = path.resolve('.logs/finance-test/ui-period.csv');
    await csv.saveAs(output);
    assert.match(fs.readFileSync(output, 'utf8'), /Synthetic UI platform,2,100/);
    await page.getByRole('button', { name: 'Ver crecimiento anual' }).click();
    await page.getByRole('heading', { name: 'Ingresos y ganancia neta por mes' }).waitFor();
    await page.waitForTimeout(1700); // Let Recharts finish the annual chart animation before visual QA.
    await page.screenshot({ path: '.logs/finance-test/historical-panel.png', fullPage: true });
    await page.getByLabel('Mes', { exact: true }).selectOption('8');
    await page.getByRole('status').filter({ hasText: 'Historial no disponible' }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'No existe cierre verificable' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: /Total vendido por día/ }).count(), 0, 'Missing history must never display live figures');
    assert.equal(await page.getByRole('button', { name: 'CSV', exact: true }).isDisabled(), true);
    await page.getByLabel('Mes', { exact: true }).selectOption('9');
    await page.getByRole('status').filter({ hasText: 'Snapshot histórico guardado' }).waitFor();
    assert.equal(await page.getByRole('cell', { name: '$ 100', exact: true }).count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: live month, persisted history, charts, annual comparison, CSV download, month selection and no live fallback.');
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
    fs.closeSync(log); await c.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
