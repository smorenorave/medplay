/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner in this CommonJS project. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ headless: true });
 const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
 let valid = true;
 let mutations = [];
 const date = new Date().toLocaleDateString('en-CA');
 const rows = [1,2].map(id => ({ id, plataforma_id: 1, contacto: '300000000'+id, nombre: 'Prueba '+id, correo: `test${id}@example.com`, contrasena: 'anterior', fecha_vencimiento: date, fecha_compra: null, meses_pagados: null, estado: 'Activo' }));
 await context.route('**/api/**', async route => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  let body = {};
  let status = 200;
  if (path === '/api/session/me') { status = valid ? 200 : 401; body = { ok: valid, user: {sub: '1'}, expiresAt: Date.now()+3600000 }; }
  else if(path === '/api/session/ping') { status = valid ? 200 : 401; body = {ok:valid}; }
  else if(path === '/api/admin/logout') { valid = false; body = {ok:true}; }
  else if(path === '/api/plataformas') body = [{id:1,nombre:'Prueba'}];
  else if(path === '/api/cuentascompletas') body = {items:rows};
  else if(path === '/api/pantallas') body = {items:[]};
  else if(path === '/api/cuentascompletas/1' && request.method()==='PATCH') { Object.assign(rows[0],request.postDataJSON()); body = rows[0]; mutations.push(path); }
  else if(path === '/api/test-expired') status = 401;
  else if(path.includes('dashboard')) body = {stockRotation:[],topServices:[],lowStock:[]};
  else body = {items:[],ok:true};
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page = await context.newPage();
 page.setDefaultTimeout(15000);
 page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
 const alerts=[];
 page.on('dialog', async dialog => { alerts.push(dialog.message()); await dialog.dismiss(); });
 await page.goto(process.env.MEDPLAY_TEST_URL || 'http://localhost:3217', {waitUntil:'networkidle',timeout:120000});
 await page.getByRole('button',{name:'Vencimientos',exact:true}).click();
 await page.getByRole('button',{name:'Editar',exact:true}).first().waitFor();
 assert.equal(await page.getByRole('button',{name:/Enviar.*clave/}).count(),0);
 await page.getByRole('button',{name:'Editar',exact:true}).first().click();
 const modal = page.getByRole('dialog');
 await modal.waitFor();
 assert.equal(await modal.getByRole('button',{name:'Copiar datos',exact:true}).count(),0);
 await modal.locator('input').evaluateAll(inputs => { const found=inputs.find(input=>input.value==='anterior'); if(found) found.setAttribute('data-test-password','true'); });
 await modal.locator('[data-test-password]').fill('actualizada');
 await modal.getByRole('button',{name:'Guardar cambios'}).click();
 await modal.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Borrar',exact:true}).waitFor();
 assert.equal(await page.locator('tbody').getByText('test1@example.com',{exact:true}).count(),0);
 assert.equal(await page.locator('tbody').getByText('test2@example.com',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Borrar',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Borrar',exact:true}).count(),1,'cancel preserves record');
 page.removeAllListeners('dialog');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Borrar',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Borrar',exact:true}).count(),0);
 assert.deepEqual(mutations,['/api/cuentascompletas/1'],'history deletion does not mutate account');
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Vencimientos',exact:true}).click();
 await page.locator('tbody').getByText('test2@example.com',{exact:true}).waitFor();
 assert.equal(await page.locator('tbody').getByText('test1@example.com',{exact:true}).count(),0,'resolved remains hidden after reload and history deletion');
 valid=false;
 await page.getByRole('button',{name:'Entrar',exact:true}).waitFor({timeout:20000});
 assert.ok(page.url().includes('reason=session-expired'));
 console.log('PASS: editor sin Copiar datos, envío ausente, cambio guardado, retiro inmediato, confirmación, borrado aislado, persistencia y cierre automático.');
 // A failed API action is intercepted before a module can show an alert.
 valid=true;
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Vencimientos',exact:true}).waitFor();
 await page.evaluate(() => { void fetch('/api/test-expired').then(()=>alert('ERROR TECNICO')); });
 await page.getByRole('button',{name:'Entrar',exact:true}).waitFor({timeout:10000});
 assert.ok(!alerts.includes('ERROR TECNICO'));
 console.log('PASS: 401 interceptado globalmente sin error técnico.');
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
