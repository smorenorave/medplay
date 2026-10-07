/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Playwright test, no MySQL. */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const fs = require('node:fs');
const base = 'http://127.0.0.1:3107';
const email = 'delete-ui@example.com';
const secret = 'local-email-deletion-ui-test-secret';

async function main() {
  const server = spawn(process.execPath, ['--require', require.resolve('./admin-ui-db.cjs'), require.resolve('next/dist/bin/next'), 'start', '-p', '3107', '-H', '127.0.0.1'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, AUTH_SECRET: secret, NEXT_PHASE: 'phase-production-build', DATABASE_URL: 'mysql://test:test@127.0.0.1:1/test' } });
  let browser, page;
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { ready = (await fetch(base)).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Next production server must start; run npm run build first.');
    assert.equal((await fetch(`${base}/api/admin/deletions`)).status, 401);
    assert.equal((await fetch(`${base}/api/admin/deletions/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auditId: '1', evento: 0, tipo: 'pantalla', id: '2' }) })).status, 401);
    assert.equal((await fetch(`${base}/api/account-deletions`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correos: [email] }) })).status, 401);
    const { SignJWT } = await import('jose');
    const normalToken = await new SignJWT({ role: 'user' }).setProtectedHeader({ alg: 'HS256' }).setSubject('1').setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    const normalHeaders = { cookie: 'authToken=' + normalToken + '; lastActivity=' + Date.now() };
    for (const path of ['/api/admin/deletions', '/api/admin/settings/deletion-audit', '/api/admin/dashboard']) assert.equal((await fetch(base + path, { headers: normalHeaders })).status, 403);
    for (const path of ['/admin', '/admin/settings', '/admin/deletions']) assert.equal((await fetch(base + path, { headers: normalHeaders, redirect: 'manual' })).status, 307);
    assert.equal((await fetch(base + '/api/admin/settings/deletion-audit', { method: 'PUT', headers: { ...normalHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ plataformas: [] }) })).status, 403);

    assert.equal((await fetch(base + '/api/admin/deletions/restore', { method: 'POST', headers: { ...normalHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ auditId: '1', evento: 0, tipo: 'pantalla', id: '2' }) })).status, 403);
    const token = await new SignJWT({ role: "admin" }).setProtectedHeader({ alg: 'HS256' }).setSubject('1').setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, timezoneId: 'America/Bogota', locale: 'es-CO' });
    await context.addCookies([{ name: 'authToken', value: token, url: base }, { name: 'lastActivity', value: String(Date.now()), url: base }]);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
    const platform = { id: 1, nombre: 'MAX', cantidad_pantallas: 5 };
    const account = { id: 1, cuenta_id: 1, correo: email, contrasena: 'ui-original-key', plataforma_id: 1, contacto: '3001234567', nombre: 'Cliente prueba', fecha_compra: today, fecha_vencimiento: today, nro_pantalla: '1', meses_pagados: 1, total_ganado: 10, total_pagado: 20, total_pagado_proveedor: 10, total_pagado_completa: 20, total_pagado_proveedor_completa: 10 };
    const screen = { ...account, id: 2 };
    let definitiveScenario = false, activeScenario = false;
    let deleted = false, deleteCalls = 0, inventoryScenario = false, archived = false, screenRestored = false, restoreCalls = 0;
    const audit = { id: '1', correo: email, clave: 'ui-original-key', plataformas: [platform], contactos: [account.contacto], eliminadoPor: 'Admin UI', motivo: 'Eliminación definitiva desde Vencimientos', identificadorOriginal: 'completa:1,compartida:1', primeraEliminacion: new Date().toISOString(), fechaEliminacion: new Date().toISOString(), registros: { eventos: [{ fechaEliminacion: new Date().toISOString(), eliminadoPor: 'Admin UI', cuentascompletas: [account], pantallas: [screen], inventario: [{ id: 3, correo: email, clave: account.contrasena }] }] } };
    const requests = [];
    await context.route('**/api/**', async route => {
      const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
      requests.push(path + url.search);
      let data;
      if (path === '/api/session/me') data = { authenticated: true, usuario: 'Admin UI', expiresAt: Date.now() + 3600000 };
      else if (path === '/api/session/ping') data = { ok: true };
      else if (path === '/api/account-data-revision') data = { revision: archived ? '3' : screenRestored || inventoryScenario ? '2' : deleted ? '1' : '0', correos: deleted && url.searchParams.get('since') === '0' ? [email] : [] };
      else if (path === '/api/admin/deletions/restore') {
        assert.equal(request.method(), 'POST');
        assert.deepEqual(request.postDataJSON(), { auditId: '1', evento: 0, tipo: 'pantalla', id: '2' });
        screenRestored = true; restoreCalls++;
        audit.registros.restauraciones = [{ evento: 0, tipo: 'pantalla', id: '2', fechaRestauracion: new Date().toISOString(), restauradoPor: 'Admin UI' }];
        data = { correos: [email], revision: '2', alreadyRestored: false };
      }
      else if (path === '/api/cuentasvencidas/delete' && request.method() === 'GET') data = { isLast: inventoryScenario, remaining: inventoryScenario ? 1 : 2, active: activeScenario, warning: activeScenario ? 'No se puede eliminar esta cuenta porque tiene usuarios activos asociados. Debes verificar y resolver estas asignaciones antes de continuar.' : null, correo: email, clave: account.contrasena, plataformaId: 1 };
      else if (path === '/api/cuentasvencidas/delete') {
        assert.equal(request.method(), 'DELETE'); assert.deepEqual(request.postDataJSON().targets, [{ tipo: 'completa', id: '1' }]);
        if (inventoryScenario && !definitiveScenario) {
          assert.equal(request.postDataJSON().destino, 'inventario');
          assert.equal(request.postDataJSON().motivo, 'Última cuenta conservada');
          archived = true; deleted = true; deleteCalls++;
          screenRestored = false;
          data = { correos: [email], revision: '3', audits: [] };
        } else {
          assert.equal(request.postDataJSON().destino, definitiveScenario ? 'eliminar' : 'inventario');
          if (definitiveScenario) assert.deepEqual(request.postDataJSON().expected, { correo: email, clave: account.contrasena, plataformaId: 1, confirmado: true });
          assert.equal(request.postDataJSON().motivo, 'Eliminación desde Vencimientos');
          audit.motivo = request.postDataJSON().motivo;
          deleted = true; if (definitiveScenario) screenRestored = false; deleteCalls++; data = { correos: [email], revision: '1', audits: [{ id: '1', correo: email }] };
        }
      }
      else if (path === '/api/admin/deletions') data = url.searchParams.has('facets') ? { plataformas: deleted ? [platform] : [] } : url.searchParams.has('id') ? { item: audit } : { items: deleted ? [audit] : [], total: deleted ? 1 : 0, pages: 1 };
      else if (path === '/api/admin/settings/deletion-audit') {
        if (request.method() === 'PUT') platform.auditarEliminaciones = request.postDataJSON().plataformas[0].habilitada;
        data = { plataformas: [{ ...platform, auditarEliminaciones: platform.auditarEliminaciones !== false }] };
      }
      else if (path === '/api/plataformas') data = [platform];
      else if (path.endsWith('/stamp')) data = { stamp: 1 }; // Unchanged max stamp deliberately exercises cache invalidation.
      else if (path.includes('check-last')) data = { isLast: inventoryScenario, remaining: inventoryScenario ? 1 : 2 };
      else if (path === '/api/cuentascompletas') data = { items: deleted ? [] : inventoryScenario ? [account] : [account, { ...account, id: 3 }], nextCursor: null };
      else if (path === '/api/pantallas') data = { items: deleted && !screenRestored ? [] : [screen], nextCursor: null };
      else if (path === '/api/inventario') data = deleted && !archived ? [] : [{ id: 3, correo: email, clave: account.contrasena, plataforma_id: 1 }];
      else if (path === '/api/cuentascompartidas') data = deleted && !screenRestored ? [] : [account];
      else if (path === '/api/usuarios') data = deleted && !screenRestored ? [] : [{ contacto: account.contacto, nombre: account.nombre }];
      else if (path === '/api/admin/dashboard' || path === '/api/dashboard') data = { salesToday: deleted ? 0 : 2, profitToday: 10, salesMonth: deleted ? 0 : 2, revenueMonth: 20, profitMonth: 10, activeScreens: deleted ? 0 : 1, expiringSoon: deleted ? 0 : 2, pendingAttention: 0, businessDate: today, topServices: [], lowStock: [], stockRotation: [] };
      else if (path === '/api/metricas-mensuales') data = { error: 'Sin snapshot de prueba' };
      else if (path === '/api/account-credentials') data = { found: !deleted, contrasena: deleted ? '' : account.contrasena };
      else data = { ok: true };
      await route.fulfill({ status: path === '/api/metricas-mensuales' ? 404 : 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/admin/settings');
    const auditCheckbox = page.getByRole('checkbox', { name: 'MAX', exact: true });
    await auditCheckbox.uncheck();
    await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click();
    await page.getByRole('status').waitFor();
    await page.reload();
    await auditCheckbox.waitFor();
    assert.equal(await auditCheckbox.isChecked(), false);
    await auditCheckbox.check();
    await page.getByRole("button", { name: "Guardar configuración", exact: true }).click();
    await page.getByRole("status").waitFor();
    await page.goto(base + '/admin');
    for (const label of ['Ventas hoy', 'Ganancia de hoy', 'Ventas del mes', 'Ingresos del mes', 'Ganancia del mes']) await page.getByText(label, { exact: true }).waitFor();
    await page.goto(base);
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await nav.waitFor();
    await page.getByText('Ventas hoy', { exact: true }).waitFor();
    for (const label of ['Ganancia de hoy', 'Ventas del mes', 'Ingresos del mes', 'Ganancia del mes']) assert.equal(await page.getByText(label, { exact: true }).count(), 0);
    if (await page.getByRole('button', { name: /Abrir cronómetro/ }).count() === 0) await page.getByTitle('Cerrar (solo oculta)').click();
    for (const name of ['Cuentas completas', 'Pantallas']) {
      await nav.getByRole('button', { name, exact: true }).click();
      await page.getByText(email, { exact: true }).filter({ visible: true }).first().waitFor();
    }
    const otherTab = await context.newPage();
    await otherTab.goto(base);
    await otherTab.getByRole('navigation', { name: 'Navegación principal' }).waitFor();
    if (await otherTab.getByRole('button', { name: /Abrir cronómetro/ }).count() === 0) await otherTab.getByTitle('Cerrar (solo oculta)').click();
    await otherTab.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Pantallas', exact: true }).click();
    await otherTab.getByText(email, { exact: true }).filter({ visible: true }).first().waitFor();
    await nav.getByRole('button', { name: 'Vencimientos', exact: true }).click();
    const target = page.getByRole('row').filter({ hasText: email }).filter({ hasText: 'Cuenta completa' }).first();
    await target.waitFor();
    await target.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('action-panel').textContent.includes('delete-ui@example.com'));
    assert.equal(deleteCalls, 1);
    await otherTab.waitForFunction(() => !document.getElementById('action-panel').textContent.includes('delete-ui@example.com'));
    for (const name of ['Cuentas completas', 'Pantallas']) {
      await nav.getByRole('button', { name, exact: true }).click();
      await page.waitForFunction(() => !document.getElementById('action-panel').textContent.includes('delete-ui@example.com'));
      assert.equal(await page.getByText(email, { exact: true }).count(), 0);
    }
    await nav.getByRole('button', { name: 'Catálogos e inventario', exact: true }).click();
    await page.getByRole('button', { name: 'Inventario', exact: true }).click();
    assert.equal(await page.getByText(email, { exact: true }).count(), 0);
    assert.equal(await nav.getByRole('link', { name: /Historial de eliminaciones/ }).count(), 0);
    await page.goto(base + '/admin');
    await page.getByRole('navigation', { name: 'Administración' }).getByRole('link', { name: /Historial de eliminaciones/ }).click();
    await page.getByText(email, { exact: true }).waitFor();
    await page.getByText('Eliminación desde Vencimientos', { exact: true }).waitFor();
    await page.getByLabel('Correo', { exact: true }).fill(email);
    await page.getByLabel('Clave', { exact: true }).fill('ui-original-key');
    await page.getByRole('combobox', { name: /^Plataforma/ }).selectOption('1');
    await page.getByLabel('Desde', { exact: true }).fill(today);
    await page.getByLabel('Hasta', { exact: true }).fill(today);
    await page.getByRole('combobox', { name: /^Orden/ }).selectOption('asc');
    const filtered = page.waitForResponse(response => response.url().includes('/api/admin/deletions?') && response.url().includes('clave=ui-original-key') && response.url().includes('plataforma=1'));
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await filtered;
    await page.waitForFunction(() => document.body.textContent.includes('1 correo eliminado'));
    assert.ok(requests.some(url => url.includes('/api/admin/deletions?') && url.includes('clave=ui-original-key') && url.includes('plataforma=1')));
    assert.ok(requests.some(url => url.includes(`desde=${today}`) && url.includes(`hasta=${today}`) && url.includes('order=asc')));
    await page.getByRole('button', { name: 'Ver detalles' }).click();
    await page.getByRole('dialog').waitFor();
    assert.match(await page.getByRole('dialog').innerText(), /ui-original-key/);
    assert.match(await page.getByRole('dialog').innerText(), /3001234567/);
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    fs.mkdirSync('.logs', { recursive: true });
    await page.screenshot({ path: '.logs/email-deletion-audit-ui.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.getByRole('heading', { name: 'Historial de eliminaciones', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile layout must contain table overflow');
    await page.screenshot({ path: '.logs/email-deletion-audit-mobile-ui.png', fullPage: true });
    await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
    const restorationDialog = page.getByRole('dialog');
    await restorationDialog.getByRole('button', { name: 'Restaurar pantalla', exact: true }).click();
    assert.equal(restoreCalls, 0, 'Restoration must wait for explicit confirmation in the UI');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Mobile restoration dialog must fit the viewport');
    await restorationDialog.getByRole('button', { name: 'Confirmar restauración', exact: true }).click();
    await restorationDialog.getByRole('button', { name: 'Restaurado', exact: true }).waitFor();
    assert.equal(restoreCalls, 1);
    assert.ok(await restorationDialog.getByRole('button', { name: 'Restaurado', exact: true }).isDisabled());
    await page.screenshot({ path: '.logs/account-restoration-mobile-ui.png', fullPage: true });
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await otherTab.getByText(email, { exact: true }).filter({ visible: true }).first().waitFor();
    await page.goto(base);
    const restoredNav = page.getByRole('navigation', { name: 'Navegación principal' });
    await restoredNav.waitFor();
    if (await page.getByRole('button', { name: /Abrir cronómetro/ }).count() === 0) await page.getByTitle('Cerrar (solo oculta)').click();
    await restoredNav.getByRole('button', { name: 'Pantallas', exact: true }).click();
    await page.getByText(email, { exact: true }).filter({ visible: true }).first().waitFor();
    await restoredNav.getByRole('button', { name: 'Vencimientos', exact: true }).click();
    await page.getByText(email, { exact: true }).filter({ visible: true }).first().waitFor();
    // A recreated final relation uses the inventory branch and propagates its revision.
    inventoryScenario = true; deleted = false;
    // Reset this isolated test browser's cached fixtures before simulating a new sale.
    await page.evaluate(() => localStorage.clear());
    await page.setViewportSize({ width: 1500, height: 1000 });
    await page.goto(base);
    const newNav = page.getByRole('navigation', { name: 'Navegación principal' });
    await newNav.waitFor();
    if (await page.getByRole('button', { name: /Abrir cronómetro/ }).count() === 0) await page.getByTitle('Cerrar (solo oculta)').click();
    await newNav.getByRole('button', { name: 'Vencimientos', exact: true }).click();
    await page.getByRole('row').filter({ hasText: email }).filter({ hasText: 'Cuenta completa' }).first().getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByText('Correo:', { exact: false }).filter({ visible: true }).first().waitFor();
    await page.getByLabel('Comentario / motivo (opcional)', { exact: true }).fill('Última cuenta conservada');
    assert.equal(await page.getByRole('dialog').getByRole('button', { name: 'Eliminar definitivamente', exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Enviar al inventario y eliminar', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('action-panel').textContent.includes('delete-ui@example.com'));
    assert.equal(deleteCalls, 2); assert.equal(audit.motivo, 'Eliminación desde Vencimientos');
    await newNav.getByRole('button', { name: 'Catálogos e inventario', exact: true }).click();
    await page.getByRole('button', { name: 'Inventario', exact: true }).click();
    await page.getByText(email, { exact: true }).filter({ visible: true }).first().waitFor();
    // The same final-record dialog also supports an explicit definitive removal.
    definitiveScenario = true; deleted = false; archived = false;
    await page.evaluate(() => localStorage.clear());
    await page.goto(base);
    const finalNav = page.getByRole('navigation', { name: 'Navegación principal' });
    await finalNav.waitFor();
    if (await page.getByRole('button', { name: /Abrir cronómetro/ }).count() === 0) await page.getByTitle('Cerrar (solo oculta)').click();
    await finalNav.getByRole('button', { name: 'Vencimientos', exact: true }).click();
    activeScenario = true;
    let activeWarning = '';
    page.once('dialog', async dialog => { activeWarning = dialog.message(); await dialog.accept(); });
    await page.getByRole('row').filter({ hasText: email }).filter({ hasText: 'Cuenta completa' }).first().getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.waitForTimeout(250);
    assert.match(activeWarning, /usuarios activos asociados/); assert.equal(deleteCalls, 2);
    assert.equal(await page.getByRole('dialog').count(), 0);
    activeScenario = false;
    await page.getByRole('row').filter({ hasText: email }).filter({ hasText: 'Cuenta completa' }).first().getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar definitivamente', exact: true }).waitFor();
    const modalBounds = await page.getByRole('dialog').boundingBox();
    assert.ok(modalBounds.x >= 0 && modalBounds.x + modalBounds.width <= 390);
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
    await page.getByText('¿Estás seguro de que deseas eliminar esta cuenta definitivamente? Esta acción no se puede deshacer y la cuenta NO será enviada al inventario.', { exact: true }).waitFor();
    assert.equal(deleteCalls, 2, 'Choosing definitive removal must wait for confirmation');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(deleteCalls, 2);
    await page.setViewportSize({ width: 1500, height: 1000 });
    assert.equal(await page.getByRole('row').filter({ hasText: email }).getByRole('button', { name: 'Eliminar definitivamente', exact: true }).count(), 0);
    await page.getByRole('row').filter({ hasText: email }).filter({ hasText: 'Cuenta completa' }).first().getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('action-panel').textContent.includes('delete-ui@example.com'));
    assert.equal(deleteCalls, 3); assert.equal(archived, false);
    assert.deepEqual(errors, []);
    console.log('UI PASS: Admin permissions, platform settings saved/reloaded, separated sales metrics, deletion/restoration, cross-tab refresh, inventory and mobile layout. No MySQL used.');
  } catch (error) {
    if (page) {
      fs.mkdirSync('.logs', { recursive: true });
      await page.screenshot({ path: '.logs/account-restoration-failure.png', fullPage: true }).catch(() => {});
      console.error('UI failure context', { url: page.url(), detailsButton: await page.getByRole('button', { name: 'Ver detalles', exact: true }).first().boundingBox().catch(() => null) });
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
