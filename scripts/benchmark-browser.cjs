// Production build, real headless browser, synthetic API fixtures. No live DB.
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3124';
async function main() {
  const server = spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','-p','3124','-H','127.0.0.1'],{windowsHide:true,stdio:'ignore',env:{...process.env,NEXT_PHASE:'phase-production-build',AUTH_SECRET:'performance-test-only',DATABASE_URL:'mysql://test:test@127.0.0.1:1/test'}});
  let browser;
  try {
    let ready=false;
    for(let i=0;i<80;i++) { try { ready=(await fetch(base)).ok; } catch {} if(ready) break; await new Promise(r=>setTimeout(r,250)); }
    assert.ok(ready,'Build and start production application first');
    browser=await chromium.launch({channel:'msedge',headless:true});
    const output={environment:'Production Next + Edge headless; API mocked in browser, 2000 synthetic records; no MySQL or real network', modules:[]};
    for(const name of ['Cuentas completas','Pantallas']) {
      const context=await browser.newContext({viewport:{width:1500,height:1000},timezoneId:'America/Bogota'});
      const requests=[];
      const rows=Array.from({length:2000},(_,i)=>({id:i+1,cuenta_id:i+1,plataforma_id:1,correo:`user${String(i).padStart(4,'0')}@example.test`,contrasena:'synthetic',contacto:`300${String(i).padStart(7,'0')}`,nombre:`Cliente ${i}`,fecha_compra:'2026-10-09',fecha_vencimiento:'2027-01-09',estado:'ACTIVA',nro_pantalla:'1',meses_pagados:3}));
      await context.addInitScript(()=>localStorage.setItem('timer_open','0'));
      await context.route('**/api/**',async route=>{
        const url=new URL(route.request().url()); requests.push(url.pathname);
        let data={ok:true};
        if(url.pathname==='/api/session/me') data={authenticated:true,expiresAt:Date.now()+3600000};
        else if(url.pathname==='/api/account-data-revision') data={revision:'0',correos:[]};
        else if(url.pathname==='/api/plataformas') data=[{id:1,nombre:'MAX',cantidad_pantallas:5}];
        else if(url.pathname==='/api/dashboard') data={salesToday:0,activeScreens:2000,expiringSoon:0,pendingAttention:0,businessDate:'2026-10-09',topServices:[],lowStock:[],stockRotation:[]};
        else if(url.pathname.endsWith('/stamp')) data={stamp:1};
        else if(['/api/pantallas','/api/cuentascompletas'].includes(url.pathname)) { const start=Number(url.searchParams.get('cursor')||0), limit=Number(url.searchParams.get('limit')||500); const items=rows.slice(start,start+limit); data={items,nextCursor:start+limit<rows.length ? start+limit:null}; }
        else if(['/api/inventario','/api/usuarios','/api/cuentascompartidas'].includes(url.pathname)) data=[];
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
      });
      const page=await context.newPage(); page.setDefaultTimeout(60000);
      const errors=[]; page.on('pageerror',error=>errors.push(error.message));
      const initial=performance.now(); await page.goto(base);
      const nav=page.getByRole('navigation').getByRole('button',{name,exact:true}); await nav.waitFor();
      const initialMs=performance.now()-initial;
      const started=performance.now(); await nav.click();
      // A loading/empty-state row also matches tbody tr; wait for actual data.
      await page.waitForFunction(()=>document.querySelector('tbody')?.textContent.includes('user0000@example.test'));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const openMs=performance.now()-started;
      const dom=await page.evaluate(()=>({elements:document.querySelectorAll('*').length,tableRows:document.querySelectorAll('tbody tr').length,mobileCards:document.querySelectorAll('article').length}));
      const search=page.getByPlaceholder(name==='Pantallas'?'Buscar nombre, contacto, correo, estado, comentario…':'Buscar contacto, correo, plataforma o anotación…');
      const searchStart=performance.now(); await search.fill('user1999');
      await page.waitForFunction(()=>{const rows=document.querySelectorAll('tbody tr');return rows.length>0&&rows.length<=2&&Array.from(rows).some(row=>row.textContent.includes('user1999'));});
      const searchMs=performance.now()-searchStart;
      const measuredRequests=requests.slice();
      if(await page.getByRole('navigation',{name:'Páginas de resultados'}).count()) {
        await search.fill('');
        await page.getByRole('button',{name:'Siguiente',exact:true}).click();
        assert.match(await page.getByRole('navigation',{name:'Páginas de resultados'}).innerText(),/Página 2 de 20/);
        await page.getByRole('checkbox',{name:'Seleccionar todo',exact:true}).check();
        await page.getByText('Seleccionados: 2000',{exact:false}).waitFor();
        await search.fill('user1999');
        await page.waitForFunction(()=>document.querySelector('tbody')?.textContent.includes('user1999'));
        assert.match(await page.getByRole('navigation',{name:'Páginas de resultados'}).innerText(),/Página 1 de 1/);
        if(name==='Pantallas') {
          const before=requests.filter(path=>path==='/api/pantallas').length;
          rows[1999].nombre='Broadcast actualizado';
          await page.evaluate(()=>{const channel=new BroadcastChannel('pantallas_mutations_bc');channel.postMessage({type:'invalidate-pantallas'});channel.close();});
          await page.locator('tbody').getByText('Broadcast actualizado',{exact:true}).waitFor();
          assert.equal(requests.filter(path=>path==='/api/pantallas').length-before,4,'One complete refresh, even when stamp did not change');
        }
        await page.setViewportSize({width:390,height:844});
        await page.locator('article').filter({hasText:'user1999'}).waitFor({state:'visible'});
      }
      assert.deepEqual(errors,[]);
      output.modules.push({name,initialMs:+initialMs.toFixed(1),openMs:+openMs.toFixed(1),searchMs:+searchMs.toFixed(1),...dom,apiRequests:measuredRequests.length,listRequests:measuredRequests.filter(p=>p==='/api/pantallas'||p==='/api/cuentascompletas').length});
      await context.close();
    }
    if(process.argv[2]) fs.writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n');
    console.log(JSON.stringify(output,null,2));
  } finally { if(browser) await browser.close(); if(server.exitCode===null) { if(process.platform==='win32') spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'}); else server.kill(); } }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
