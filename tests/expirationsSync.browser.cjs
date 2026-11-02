/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser fixture. */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3127';
const secret = 'isolated-expirations-sync';
async function main() {
  const server = spawn(process.execPath, ['--require', require.resolve('./admin-ui-db.cjs'), require.resolve('next/dist/bin/next'), 'start', '-p', '3127', '-H', '127.0.0.1'], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, MEDPLAY_NEXT_DIST_DIR: process.env.MEDPLAY_NEXT_DIST_DIR || '.next-verify', AUTH_SECRET: secret, NEXT_PHASE: 'phase-production-build', DATABASE_URL: 'mysql://test:test@127.0.0.1:1/test' },
  });
  let serverOutput = '';
  server.stdout.on('data', chunk => { serverOutput += chunk; });
  server.stderr.on('data', chunk => { serverOutput += chunk; });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { ready = (await fetch(base)).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(ready, `Build the isolated .next-verify output first. ${serverOutput}`);
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    // A distant client timezone must still classify the date in Bogota.
    const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, timezoneId: 'Asia/Tokyo' });
    const { SignJWT } = await import('jose');
    const token = await new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setSubject('1').setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    await context.addCookies([{ name: 'authToken', value: token, url: base }, { name: 'lastActivity', value: String(Date.now()), url: base }]);
    const common = { tipo: 'pantalla', cuenta_id: 7, plataforma_id: 1, correo: 'managed@example.com', contrasena: 'key', contacto: '3001234567', nombre: 'Prueba', fecha_compra: '2026-09-29', estado: 'ACTIVA', total_pagado: 14900, passwordManagedAt: '2026-10-30T00:00:00.000Z' };
    let rows = ['2026-10-29', '2026-11-02', '2026-11-03', '2026-12-01'].map((date, i) => ({ ...common, id: String(i + 1), nro_pantalla: String(i + 1), fecha_vencimiento: date }));
    const complete = { ...common, id: '9007199254740993', correo: 'complete@example.com', tipo: 'cuenta', fecha_vencimiento: '2026-10-28' };
    let revision = 0, deletes = 0;
    await context.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      let data = { ok: true };
      if (path === '/api/session/me') data = { authenticated: true, usuario: 'Prueba', expiresAt: Date.now() + 3600000 };
      else if (path === '/api/account-data-revision') data = { revision: String(revision), correos: [] };
      else if (path === '/api/plataformas') data = [{ id: 1, nombre: 'Prueba', cantidad_pantallas: 4 }];
      else if (path.endsWith('/stamp')) data = { stamp: revision };
      else if (path === '/api/cuentasvencidas') data = { items: [...rows, complete], today: '2026-11-02', timeZone: 'America/Bogota' };
      else if (path === '/api/pantallas') data = { items: rows, nextCursor: null };
      else if (path === '/api/record-deletions') {
        const body = req.postDataJSON();
        assert.deepEqual(body.target, { tipo: 'pantalla', id: '1' });
        if (req.method() === 'POST') data = { cuentaId: '7', last: false, count: rows.length };
        else {
          assert.deepEqual(body.decision, { cuentaId: '7', action: 'record' });
          rows = rows.filter(row => row.id !== '1'); revision++; deletes++;
          data = { deleted: true, archived: false, revision: String(revision), correos: [] };
        }
      } else if (['/api/cuentascompletas', '/api/cuentascompartidas', '/api/usuarios', '/api/inventario'].includes(path)) data = [];
      else if (path.includes('dashboard')) data = { salesToday: 0, profitToday: 0, revenueMonth: 0, profitMonth: 0, activeScreens: rows.length, expiringSoon: 0, pendingAttention: 0, businessDate: '2026-11-02', topServices: [], lowStock: [], stockRotation: [] };
      await route.fulfill({ json: data });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-03T02:00:00Z'));
    const nav = name => page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name, exact: true });
    const open = async () => { await page.goto(base); await nav('Vencimientos').click(); await page.getByRole('heading', { name: 'Vencimientos de cuentas y pantallas' }).waitFor(); };
    const card = title => page.getByText(title, { exact: true }).locator('..').locator('.text-2xl');
    await open();
    await page.getByText('1 fila(s) visibles', { exact: true }).waitFor();
    assert.equal(await card('Anteriores (vencidas)').innerText(), '2');
    assert.equal(await card('Vencen hoy').innerText(), '1');
    assert.equal(await card('Vencen mañana').innerText(), '1');
    const selects = page.getByRole('combobox');
    await selects.nth(2).selectOption('proximos');
    await page.getByRole('row').filter({ hasText: '01/12/2026' }).waitFor();
    await selects.nth(2).selectOption('anteriores');
    await page.getByText('2 fila(s) visibles', { exact: true }).waitFor();
    await selects.nth(1).selectOption('pantalla');
    await page.getByText('1 fila(s) visibles', { exact: true }).waitFor();
    assert.equal(await card('Anteriores (vencidas)').innerText(), '1');
    const expired = page.getByRole('row').filter({ hasText: '29/10/2026' });
    await expired.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(deletes, 0);
    await expired.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar registro', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByText('0 fila(s) visibles', { exact: true }).waitFor();
    assert.equal(deletes, 1);
    assert.equal(await card('Anteriores (vencidas)').innerText(), '0');
    await nav('Pantallas').click();
    await page.getByRole('heading', { name: 'Gestión de pantallas' }).waitFor();
    await page.getByRole('row').filter({ hasText: '03/11/2026' }).waitFor();
    assert.equal(await page.getByRole('row').filter({ hasText: '29/10/2026' }).count(), 0);
    assert.equal(await page.getByRole('row').filter({ hasText: 'managed@example.com' }).filter({ has: page.getByRole('button', { name: 'Eliminar', exact: true }) }).count(), 3);
    await open();
    await page.getByText('1 fila(s) visibles', { exact: true }).waitFor();
    await page.getByRole('combobox').nth(2).selectOption('anteriores');
    await page.getByText('1 fila(s) visibles', { exact: true }).waitFor();
    assert.equal(await page.getByRole('row').filter({ hasText: '29/10/2026' }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: Bogota dates in Tokyo, managed records, all buckets, matching filtered counters, cancel, permanent ID deletion, Pantallas and reload, three siblings retained.');
  } finally { if (browser) await browser.close(); server.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
