/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner in this CommonJS project. */
const assert = require('node:assert/strict');
require('dotenv').config({quiet:true});
(async()=>{
 const { SignJWT } = await import('jose');
 const key = new TextEncoder().encode(process.env.AUTH_SECRET);
 const sign = expires => new SignJWT({}).setProtectedHeader({alg:'HS256'}).setSubject('1').setExpirationTime(expires).sign(key);
 const token = await sign('1h');
 const expired = await sign(Math.floor(Date.now()/1000)-10);
 const base = process.env.MEDPLAY_TEST_URL || 'http://localhost:3217';
 for(const [name,t,last] of [['inactividad',token,Date.now()-3600000],['token vencido',expired,Date.now()],['actividad corrupta',token,'NaN']]) {
  for (const path of ['me','ping']) {
   const r=await fetch(`${base}/api/session/${path}`,{method:path==='me'?'GET':'POST',headers:{cookie:`authToken=${t}; lastActivity=${last}`}});
   assert.equal(r.status,401,`${name}/${path}`);
   assert.ok(r.headers.get('set-cookie').includes('Max-Age=0'));
  }
 }
 const cookie=`authToken=${token}; lastActivity=${Date.now()}`;
 const me=await fetch(`${base}/api/session/me`,{headers:{cookie}});
 assert.equal(me.status,200);
 assert.equal(me.headers.get('set-cookie'),null,'checking does not renew inactivity');
 const ping=await fetch(`${base}/api/session/ping`,{method:'POST',headers:{cookie}});
 assert.equal(ping.status,200);
 assert.ok(ping.headers.get('set-cookie').includes('lastActivity='));
 const blocked=await fetch(`${base}/api/cuentascompletas`,{headers:{cookie:`authToken=${expired}; lastActivity=${Date.now()}`}});
 assert.equal(blocked.status,401);
 console.log('PASS: sesión real con JWT válido/vencido, inactividad, cookies inválidas, limpieza de cookies y middleware.');
})().catch(e=>{console.error(e);process.exit(1)});
