/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser regression. */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3119';
const secret = 'isolated-pantalla-ui-secret';
async function main() {
  const server = spawn(process.execPath, ['--require', require.resolve('./admin-ui-db.cjs'), require.resolve('next/dist/bin/next'), 'start', '-p', '3119', '-H', '127.0.0.1'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, AUTH_SECRET: secret, NEXT_PHASE: 'phase-production-build', DATABASE_URL: 'mysql://test:test@127.0.0.1:1/test' } });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) { try { ready = (await fetch(base)).ok; } catch {} if (ready) break; await new Promise(r => setTimeout(r, 200)); }
    assert.ok(ready, 'Run npm run build first');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
    const { SignJWT } = await import('jose');
    const token = await new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setSubject('1').setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    await context.addCookies([{ name: 'authToken', value: token, url: base }, { name: 'lastActivity', value: String(Date.now()), url: base }]);
    const platform = { id: 1, nombre: 'Test', cantidad_pantallas: 6 };
    const row = { cuenta_id: 71, plataforma_id: 1, plataforma: 'Test', correo: 'test@example.com', contrasena: 'test-key', contacto: '3001234567', nombre: 'Prueba', fecha_compra: '2026-10-01', fecha_vencimiento: '2099-12-31', estado: 'activa', total_pagado: 6900 };
    let rows = Array.from({ length: 6 }, (_, i) => ({ ...row, id: i + 1, nro_pantalla: String(i + 1) }));
    let deletes = [], globalCalls = 0, revision = 0;
    await context.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), p = url.pathname; let data = { ok: true };
      if (p === '/api/account-deletions') globalCalls++;
      if (p === '/api/session/me') data = { authenticated: true, usuario: 'Prueba', expiresAt: Date.now() + 3600000 };
      else if (p === '/api/account-data-revision') data = { revision: String(revision), correos: [] };
      else if (p === '/api/plataformas') data = [platform];
      else if (p.endsWith('/stamp')) data = { stamp: revision };
      else if (p === '/api/pantallas') data = { items: rows, nextCursor: null };
      else if (/\/api\/pantallas\/\d+$/.test(p)) {
        const id = Number(p.split('/').at(-1));
        if (req.method() === 'DELETE') {
          const body = req.postDataJSON(); assert.equal(body.cuentaId, 71); assert.ok(['record', 'inventory', 'purge'].includes(body.action));
          deletes.push({ id, ...body }); rows = rows.filter(r => r.id !== id); revision++;
          data = { deleted: true, archived: body.action === 'inventory', revision: String(revision), correos: [] };
        } else data = { cuentaId: 71, last: rows.length === 1, count: rows.length };
      } else if (p === '/api/cuentascompartidas') data = [{ id: 71, ...row, plataformas: platform }];
      else if (p === '/api/usuarios') data = [{ contacto: row.contacto, nombre: row.nombre }];
      else if (p === '/api/admin/dashboard' || p === '/api/dashboard') data = { salesToday: 0, profitToday: 0, salesMonth: 0, revenueMonth: 0, profitMonth: 0, activeScreens: rows.length, expiringSoon: 0, pendingAttention: 0, businessDate: '2026-10-13', topServices: [], lowStock: [], stockRotation: [] };
      else if (p === '/api/inventario' || p === '/api/cuentascompletas') data = [];
      await route.fulfill({ json: data });
    });
    const page = await context.newPage();
    page.on('pageerror', error => console.error('Browser error:', error.message));
    const open = async () => { await page.goto(base); await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Pantallas', exact: true }).click(); await page.getByRole('heading', { name: 'Gestión de pantallas' }).waitFor(); };
    const trash = () => page.getByRole('row').filter({ hasText: row.correo }).getByRole('button', { name: 'Eliminar', exact: true }).first();
    await open(); await trash().click();
    await page.getByRole('dialog').getByText(/Solo se eliminará este registro/).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click(); assert.equal(deletes.length, 0);
    await trash().click(); await page.getByRole('dialog').getByRole('button', { name: 'Eliminar pantalla', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(rows.length, 5); assert.equal(deletes[0].action, 'record');
    assert.equal(await page.getByRole('row').filter({ hasText: row.correo }).getByRole('button', { name: 'Eliminar', exact: true }).count(), 5);
    rows = [{ ...row, id: 20, nro_pantalla: '2' }]; revision++; await open(); await trash().click();
    await page.getByRole('dialog').getByText(/última pantalla asignada/).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Enviar cuenta a inventario', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(deletes.at(-1).action, 'inventory');
    rows = [{ ...row, id: 30, nro_pantalla: '3' }]; revision++; await open(); await trash().click();
    page.once('dialog', d => d.dismiss()); await page.getByRole('dialog').getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click(); assert.equal(rows.length, 1);
    page.once('dialog', d => d.accept()); await page.getByRole('dialog').getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(deletes.at(-1).action, 'purge');
    rows = [1, 2, 3].map(id => ({ ...row, id, nro_pantalla: String(id) })); revision++; await open();
    await page.getByRole('row').filter({ hasText: row.correo }).getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Eliminar seleccionados', exact: true }).click();
    page.once('dialog', d => d.accept()); await page.getByRole('dialog').getByRole('button', { name: 'Eliminar seleccionadas', exact: true }).click();
    await page.getByRole('dialog').getByText('Registros eliminados: 1', { exact: true }).waitFor(); assert.equal(rows.length, 2);
    assert.equal(globalCalls, 0); console.log('PASS: individual, cancel, counters, last inventory, last purge, bulk; zero global calls.');
  } finally { if (browser) await browser.close(); server.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
