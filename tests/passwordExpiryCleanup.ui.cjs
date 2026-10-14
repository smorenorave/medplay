/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression with mocked APIs. */
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3133';
const dist = '.logs/password-expiry-next';

async function main() {
  const originalConfig = fs.readFileSync('tsconfig.json', 'utf8');
  const originalNextEnv = fs.readFileSync('next-env.d.ts', 'utf8');
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-p', '3133', '-H', '127.0.0.1'], { windowsHide: true, stdio: ['ignore', fs.openSync('.logs/password-expiry-server.log','w'), fs.openSync('.logs/password-expiry-server-error.log','w')], env: { ...process.env, MEDPLAY_NEXT_DIST_DIR: dist, AUTH_SECRET: 'inventory-ui-test-only', DATABASE_URL: 'mysql://test:test@127.0.0.1:1/test' } });
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

    await context.addInitScript(() => localStorage.clear());
    const platform = { id: 1, nombre: 'Test', cantidad_pantallas: 6 };
    const baseRow = { cuenta_id: 71, plataforma_id: 1, correo: 'same@example.com', contrasena: 'key', contacto: '3001234567', nombre: 'Prueba', fecha_compra: '2026-09-12', fecha_vencimiento: '2026-10-13', estado: 'ACTIVA', meses_pagados: 1, total_pagado: 6900 };
    let rows = [], tipo = 'completa', calls = [], revision = 0, failId = null;
    await context.route('**/api/**', async route => {
      const req = route.request(), pathname = new URL(req.url()).pathname;
      let data = { ok: true }, status = 200, headers = {};
      if (req.method() === 'PATCH') {
        calls.push(req.postDataJSON()); rows = rows.filter(r => r.fecha_vencimiento > '2026-10-13');
        headers['X-Expired-Records-Deleted'] = JSON.stringify({ revision: String(++revision), deleted: 2, correos: [] }); data = {};
      } else if (pathname === '/api/account-deletions') throw Error('Unexpected global deletion');
      else if (pathname === '/api/session/me') data = { authenticated: true, expiresAt: Date.now() + 3600000 };
      else if (pathname === '/api/plataformas') data = [platform];
      else if (pathname === '/api/dashboard') data = { salesToday: 0, activeScreens: 0, expiringSoon: 0, pendingAttention: 0, businessDate: '2026-10-13', topServices: [], lowStock: [], stockRotation: [] };
      else if (pathname === '/api/account-data-revision') data = { revision: String(revision), correos: [] };
      else if (pathname.endsWith('/stamp')) data = { stamp: revision };
      else if (pathname === '/api/cuentascompletas') data = { items: tipo === 'completa' ? rows : [], nextCursor: null };
      else if (pathname === '/api/pantallas') data = { items: tipo === 'pantalla' ? rows : [], nextCursor: null };
      else if (pathname === '/api/cuentascompartidas' || pathname === '/api/inventario' || pathname === '/api/usuarios') data = [];
      await route.fulfill({ status, headers, json: data });
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    await page.clock.install({ time: new Date('2026-10-14T02:30:00Z') });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let dialogs = 0; page.on('dialog', async dialog => { dialogs++; await dialog.dismiss(); });
    for (const [view, type] of [['Cuentas completas', 'completa'], ['Pantallas', 'pantalla'], ['Vencimientos', 'completa'], ['Vencimientos', 'pantalla']]) {
      tipo = type;
      const open = async count => {
        rows = Array.from({ length: count }, (_, i) => ({ ...baseRow, id: i+1, nro_pantalla: String(i+1) })); calls = []; revision++;
        await page.goto(base); await page.getByRole('navigation').getByRole('button', { name: view, exact: true }).click();
        if(view==='Vencimientos') await page.locator('select').filter({has:page.locator('option[value=\"todos\"]')}).selectOption('todos');
        await page.locator('tbody tr').filter({ hasText: baseRow.correo }).first().waitFor();
      };
      await open(3);
      rows[1].fecha_vencimiento = '2026-10-12';
      rows[2].fecha_vencimiento = '2026-10-14';
      const selected = page.locator('tbody tr').filter({ hasText: baseRow.correo }).getByRole('button', { name: /Editar/i }).first();
      await selected.click();
      const modal = page.getByRole('dialog');
      await modal.locator('input').evaluateAll(inputs => { const input=inputs.find(i=>i.value==='key'); if(input) input.setAttribute('data-test-password','true'); });
      await modal.locator('[data-test-password]').fill('new-password');
      await modal.getByRole('button',{name:'Guardar cambios'}).click();
      await modal.waitFor({state:'hidden'});
      for(let attempt=0; attempt<100 && await page.locator('tbody').getByRole('button',{name:/Editar/i}).count()!==1;attempt++) await page.waitForTimeout(100);
      assert.equal(await page.locator('tbody').getByRole('button',{name:/Editar/i}).count(),1,await page.locator('tbody').innerText());
      assert.equal(rows.length,1); assert.equal(calls.length,1); assert.equal(calls[0].contrasena,'new-password');
      await page.reload(); await page.getByRole('navigation').getByRole('button',{name:view,exact:true}).click();
      if(view==='Vencimientos') await page.locator('select').filter({has:page.locator('option[value="todos"]')}).selectOption('todos');
      for(let attempt=0; attempt<100 && await page.locator('tbody').getByRole('button',{name:/Editar/i}).count()!==1;attempt++) await page.waitForTimeout(100);
      assert.equal(await page.locator('tbody').getByRole('button',{name:/Editar/i}).count(),1,await page.locator('tbody').innerText());
      assert.equal(dialogs,0);
      console.log('PASS',view,tipo,'actualización desde servidor y recarga conserva sólo vigente');
    }
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
