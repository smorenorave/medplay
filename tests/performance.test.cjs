const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request.startsWith('@/lib/')) request = path.resolve(__dirname, '../lib', request.slice(6));
  else if (request.startsWith('@generated/')) request = path.resolve(__dirname, '../src/generated', request.slice(11));
  return resolve.call(this, request, ...args);
};
const { pageLimit } = require('../lib/pagination.ts');
const { settleWithConcurrency } = require('../lib/settleWithConcurrency.ts');
const { withRouteTiming } = require('../lib/routeTiming.ts');
let data = [], calls = [];
const findMany = async args => {
  calls.push(args);
  const from = args.cursor ? data.findIndex(row => Number(row.id) === Number(args.cursor.id)) + args.skip : 0;
  return data.slice(from, from + args.take);
};
global.prisma = { pantallas: { findMany }, cuentascompletas: { findMany } };
const routes = { pantallas: require('../src/app/api/pantallas/route.ts'), cuentascompletas: require('../src/app/api/cuentascompletas/route.ts') };

test('page limits preserve defaults, clamp bounds and accept only integral take values', () => {
  for (const raw of [null, '', ' ', 'NaN', 'Infinity']) assert.equal(pageLimit(raw,300),300);
  for (const [raw, expected] of [['0',1],['-2',1],['2.9',2],['99999',5000],['100',100]]) assert.equal(pageLimit(raw,300),expected);
});
test('handler timing preserves status, cookies and body on success and handled errors', async () => {
  for (const status of [200,400,409,500]) {
    const response=await withRouteTiming(async () => new Response('unchanged',{status,headers:{'set-cookie':'test=1; HttpOnly'}}))();
    assert.equal(response.status,status); assert.equal(await response.text(),'unchanged');
    assert.equal(response.headers.get('set-cookie'),'test=1; HttpOnly');
    assert.match(response.headers.get('server-timing'),/^app;dur=\d+\.\d{2}$/);
  }
});
for (const [name, route] of Object.entries(routes)) {
  test(`${name}: cursor pages return every row once and avoid the empty trailing request`, async () => {
    for (const size of [0,1,3,4,6,7]) {
      data = Array.from({length:size}, (_,i) => ({ id:i+1, plataforma_id:1, contacto:'test', fecha_vencimiento:new Date('2026-11-01') }));
      calls = []; const seen = []; let cursor = null;
      do {
        const response = await route.GET(new Request(`http://local/api/${name}?limit=3${cursor ? '&cursor='+cursor : ''}`));
        assert.equal(response.status,200);
        const json = await response.json();
        seen.push(...json.items.map(row => row.id)); cursor = json.nextCursor;
      } while(cursor);
      assert.deepEqual(seen,data.map(row => row.id));
      assert.equal(calls.length,Math.max(1,Math.ceil(size/3)));
    }
  });
  test(`${name}: default size and existing query filters reach the database`, async () => {
    data = []; calls = [];
    await route.GET(new Request(`http://local/api/${name}?plataforma_id=2&q=test&vencidas=1&hoy=2026-10-09&manana=2026-10-10`));
    assert.equal(calls[0].take, name === 'pantallas' ? 301 : 201);
    assert.equal(calls[0].where.OR.length > 0,true);
    assert.equal(calls[0].where.fecha_vencimiento.lte.toISOString(),'2026-10-10T00:00:00.000Z');
    assert.equal(name === 'pantallas' ? calls[0].where.cuentascompartidas.plataforma_id : calls[0].where.plataforma_id,2);
  });
}
test('100 writes bound concurrency, retain order and continue after synchronous and async failures', async () => {
  let active=0, peak=0;
  const result = await settleWithConcurrency(Array.from({length:100},(_,i) => i), (item,index) => {
    assert.equal(item,index);
    if (item===3) throw Error('sync');
    return (async () => {
      active++; peak=Math.max(peak,active);
      await new Promise(resolve => setTimeout(resolve,item%3)); active--;
      if (item===7) throw Error('async');
      return item*2;
    })();
  });
  assert.equal(peak,4); assert.equal(active,0); assert.equal(result.length,100);
  result.forEach((row,i) => {
    assert.equal(row.status,[3,7].includes(i) ? 'rejected':'fulfilled');
    if (row.status==='fulfilled') assert.equal(row.value,i*2);
  });
  assert.deepEqual(await settleWithConcurrency([],async x => x),[]);
  await assert.rejects(settleWithConcurrency([1],async x => x,0),RangeError);
});
