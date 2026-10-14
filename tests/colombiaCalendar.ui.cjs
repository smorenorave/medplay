/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression with mocked APIs. */
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3129';
const dist = '.logs/colombia-next';

async function main() {
  const originalConfig = fs.readFileSync('tsconfig.json', 'utf8');
  const originalNextEnv = fs.readFileSync('next-env.d.ts', 'utf8');
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-p', '3129', '-H', '127.0.0.1'], { windowsHide: true, stdio: ['ignore', fs.openSync('.logs/calendar-server.log','w'), fs.openSync('.logs/calendar-server-error.log','w')], env: { ...process.env, MEDPLAY_NEXT_DIST_DIR: dist, AUTH_SECRET: 'inventory-ui-test-only', DATABASE_URL: 'mysql://test:test@127.0.0.1:1/test' } });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { ready = (await fetch(base)).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    assert.ok(ready, 'Test server did not start');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, timezoneId: process.env.CALENDAR_TZ || 'America/Los_Angeles', locale: 'en-US' });
    await context.addInitScript(() => localStorage.setItem('timer_open', '0'));
    const platform = { id: 1, nombre: 'MAX', cantidad_pantallas: 5, total_pagado: 20, total_pagado_proveedor: 5, total_pagado_completa: 50, total_pagado_proveedor_completa: 10 };
    const stock = { id: 7, plataforma_id: 1, correo: 'stock-ui@example.com', clave: 'inventory-key' };
    const old = { id: 20, cuenta_id: 10, correo: 'old-ui@example.com', contrasena: 'old-key', plataforma_id: 1, contacto: '3001234567', nombre: 'Cliente', fecha_compra: '2026-09-12', fecha_vencimiento: '2026-10-12', meses_pagados: 1, nro_pantalla: '1', estado: 'ACTIVA', total_pagado: 20, total_pagado_proveedor: 5, total_pagado_completa: 50, total_pagado_proveedor_completa: 10 };
    let available = true;
    const writes = [];
    await context.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      let data = { ok: true };
      if (req.method() !== 'GET') writes.push({ path, method: req.method(), body: req.postDataJSON() });
      if (path === '/api/session/me') data = { authenticated: true, expiresAt: Date.now() + 3600000 };
      else if (path === '/api/dashboard') data = { salesToday: 0, activeScreens: 0, expiringSoon: 0, pendingAttention: 0, businessDate: '2026-10-09', topServices: [], lowStock: [], stockRotation: [] };
      else if (path === '/api/plataformas') data = [platform];
      else if (path === '/api/plataformas/1') data = platform;
      else if (path === '/api/inventario') data = available ? [stock] : [];
      else if (path === '/api/account-data-revision') data = { revision: '0', correos: [] };
      else if (path.endsWith('/stamp')) data = { stamp: 1 };
      else if (path === '/api/account-credentials') data = { found: true, contrasena: url.searchParams.get('correo') === stock.correo ? stock.clave : old.contrasena };
      else if (path.startsWith('/api/usuarios')) data = path === '/api/usuarios' ? [{ contacto: old.contacto, nombre: old.nombre }] : { contacto: old.contacto, nombre: old.nombre };
      else if (path === '/api/cuentascompartidas') data = [{ id: 10, plataforma_id: 1, correo: old.correo, contrasena: old.contrasena }];
      else if (/^\/api\/(cuentascompletas|pantallas)(\/\d+)?$/.test(path)) {
        if (req.method() === 'GET') data = /\/\d+$/.test(path) ? { ...old, usuarios: { contacto: old.contacto, nombre: old.nombre } } : { items: [old], nextCursor: null };
        else {
          const body = req.postDataJSON();

          Object.assign(old, body);
          const saved = { ...old, ...body, id: 20, cuenta_id: 11, usuarios: { contacto: old.contacto, nombre: old.nombre } };
          data = path.includes('pantallas/') ? { row: saved, correo: body.correo, contrasena: body.contrasena, plataforma_id: 1 } : saved;
        }
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const nav = name => page.getByRole('navigation').getByRole('button', { name, exact: true }).click();


    await page.clock.install({ time: new Date('2026-10-14T02:30:00Z') });
    for (const name of ['Nueva cuenta completa', 'Nueva pantalla']) {
      await page.goto(base); await nav(name);
      const date = page.locator('input[data-colombia-date]').first();
      assert.equal(await date.inputValue(), '13/10/2026');
      await date.fill('05/08/2026');
      assert.equal(await date.inputValue(), '05/08/2026');
      await page.waitForFunction(() => document.querySelectorAll('input[data-colombia-date]')[1].value === '05/09/2026');
      await page.getByRole('button', { name: 'Abrir calendario de Colombia', exact: true }).first().click();
      const calendar = page.getByRole('dialog', { name: 'Calendario de Colombia', exact: true });
      assert.match(await calendar.innerText(), /Lun\s+Mar\s+Mié\s+Jue\s+Vie\s+Sáb\s+Dom/);
      await calendar.getByRole('button', { name: '15/08/2026', exact: true }).click();
      assert.equal(await date.inputValue(), '15/08/2026');
      await page.getByRole('button', { name: 'Abrir calendario de Colombia', exact: true }).first().click();
      await calendar.getByRole('button', { name: 'Hoy', exact: true }).click();
      assert.equal(await date.inputValue(), '13/10/2026');
      await date.fill('31/02/2026');
      assert.equal(await date.evaluate(el => el.checkValidity()), false);
      console.log('PASS', name, 'manual, calendario, lunes, Hoy y validación');
    }
    for (const name of ['Cuentas completas', 'Pantallas']) {
      await page.goto(base); await nav(name);
      await page.locator('tbody tr').filter({ hasText: old.correo }).getByText('VENCIDA', { exact: true }).waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
      const date = page.locator('input[data-colombia-date]').first();
      await page.getByRole('button', { name: 'Hoy', exact: true }).click();
      assert.equal(await date.inputValue(), '13/10/2026');
      await date.fill('05/08/2026');
      await page.getByRole('dialog').getByRole('button', { name: /Guardar/ }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      const write = writes.filter(w => w.method === 'PATCH').at(-1);
      assert.equal(write.body.fecha_compra, '2026-08-05');
      assert.equal(write.body.fecha_vencimiento, '2026-09-05');
      await page.reload(); await nav(name);
      await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
      assert.equal(await date.inputValue(), '05/08/2026');
      console.log('PASS', name, 'Hoy, guardado YYYY-MM-DD y recarga con API simulada');
    }
    await page.clock.setFixedTime(new Date('2026-10-14T05:30:00Z'));
    await page.goto(base); await nav('Nueva cuenta completa');
    assert.equal(await page.locator('input[data-colombia-date]').first().inputValue(), '14/10/2026');
    console.log('PASS medianoche Colombia, zona:', process.env.CALENDAR_TZ || 'America/Los_Angeles');
    assert.deepEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    if (process.platform === 'win32' && server.exitCode === null) {
      spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else server.kill();
    fs.writeFileSync('next-env.d.ts', originalNextEnv);
    // Next adds its isolated generated types to tsconfig during development.
    const current = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    const original = JSON.parse(originalConfig);
    const currentIncludes = current.include.filter(item => item !== `${dist}/types/**/*.ts`);
    if (JSON.stringify([...currentIncludes].sort()) === JSON.stringify([...original.include].sort())) current.include = original.include;
    if (JSON.stringify(current) === JSON.stringify(JSON.parse(originalConfig))) fs.writeFileSync('tsconfig.json', originalConfig);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
