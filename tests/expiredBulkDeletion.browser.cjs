/* eslint-disable @typescript-eslint/no-require-imports -- Browser regression with simulated APIs. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MEDPLAY_TEST_URL || 'http://127.0.0.1:3218';
(async () => {
  const { SignJWT } = await import('jose');
  const token = await new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setSubject('1').setExpirationTime('1h').sign(new TextEncoder().encode('bulk-local-test-secret'));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    assert.equal((await fetch(base + '/api/cuentasvencidas/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targets: [{ tipo: 'completa', id: '1' }], destino: 'eliminar', bulkConfirmed: true }) })).status, 401);
    for (const mixed of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 1500, height: 1100 }, timezoneId: 'America/Bogota' });
      await context.addCookies([{ name: 'authToken', value: token, url: base }, { name: 'lastActivity', value: String(Date.now()), url: base }]);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
      let calls = 0;
      let rows = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, correo: `last${i + 1}@example.com`, contrasena: 'not-for-audit', plataforma_id: 1, contacto: '3001234567', nombre: 'Prueba', fecha_vencimiento: today, fecha_compra: today }));
      await context.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url()), path = url.pathname;
        let data = { items: [], ok: true };
        if (path === '/api/session/me') data = { authenticated: true, usuario: 'Admin', expiresAt: Date.now() + 3600000 };
        else if (path === '/api/admin/dashboard' || path === '/api/dashboard') data = { salesToday: 0, profitToday: 0, salesMonth: 0, revenueMonth: 0, profitMonth: 0, activeScreens: 0, expiringSoon: 8, pendingAttention: 0, businessDate: today, topServices: [], lowStock: [], stockRotation: [] };
        else if (path === '/api/plataformas') data = [{ id: 1, nombre: 'Prueba' }];
        else if (path === '/api/account-data-revision') data = { revision: String(calls), correos: [] };
        else if (path.endsWith('/stamp')) data = { stamp: calls };
        else if (path === '/api/cuentascompletas') data = { items: rows, nextCursor: null };
        else if (path === '/api/cuentasvencidas/delete' && request.method() === 'GET') data = { selectedId: url.searchParams.get('id'), selectedType: 'completa', isLast: !mixed || Number(url.searchParams.get('id')) > 4, selectedActive: mixed && url.searchParams.get('id') === '8' };
        else if (path === '/api/cuentasvencidas/delete') {
          const payload = request.postDataJSON();
          assert.equal(payload.bulkConfirmed, true); assert.equal(payload.destino, 'eliminar'); assert.equal(payload.targets.length, 8); assert.equal(payload.expected, undefined);
          calls++;
          rows = mixed ? rows.filter(row => row.id === 8) : [];
          data = { revision: String(calls), correos: [], eliminated: mixed ? 6 : 8, skipped: mixed ? [{ tipo: 'completa', id: '8', correo: 'last8@example.com', reason: 'Tiene asignaciones activas.' }, { tipo: 'completa', id: '7', reason: 'El registro ya no existe.' }] : [] };
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      });
      const page = await context.newPage();
      const errors = [], dialogs = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
      await page.goto(base, { waitUntil: 'networkidle', timeout: 120000 });
      await page.getByRole('button', { name: 'Vencimientos', exact: true }).click();
      await page.getByRole('checkbox', { name: 'Seleccionar todos (visibles)', exact: true }).check();
      await page.getByRole('button', { name: 'Eliminar seleccionados', exact: true }).click();
      const modal = page.getByRole('dialog');
      await modal.waitFor();
      assert.match(await modal.innerText(), /Total a procesar: 8/);
      assert.match(await modal.innerText(), new RegExp('Registros normales: ' + (mixed ? 4 : 0)));
      const button = modal.getByRole('button', { name: 'Eliminar selección', exact: true });
      assert.equal(await button.isDisabled(), true); assert.equal(calls, 0);
      await modal.getByRole('checkbox', { name: 'Entiendo que se eliminarán definitivamente los registros seleccionados, incluidos los últimos registros, y deseo continuar', exact: true }).check();
      await button.click();
      await modal.getByRole('status').waitFor();
      assert.match(await modal.getByRole('status').innerText(), mixed ? /Eliminados: 6. Omitidos: 2/ : /Eliminados: 8. Omitidos: 0/);
      assert.equal(calls, 1); assert.equal(await button.isDisabled(), true);
      assert.deepEqual(dialogs, []); assert.deepEqual(errors, []);
      await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), mixed ? 'bulk-deletion-mixed.png' : 'bulk-deletion-eight.png'), fullPage: true });
      await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await context.close();
    }
    console.log('PASS: administrator API gate, eight final records, mixed summary, explicit confirmation, one request, no individual alerts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
