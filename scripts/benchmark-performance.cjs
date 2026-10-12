// Executes the actual viewer calculations and route handlers with synthetic data.
// No network, database credentials or production writes are used.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { performance } = require('node:perf_hooks');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  if (request.startsWith('@/lib/')) request = path.resolve(__dirname, '../lib', request.slice(6));
  else if (request.startsWith('@generated/')) request = path.resolve(__dirname, '../src/generated', request.slice(11));
  return resolve.call(this, request, ...args);
};
const rows = Array.from({ length: 10000 }, (_, i) => ({ id: i + 1, correo: `user${i % 2000}@example.test`, plataforma_id: i % 10 + 1, fecha_vencimiento: '2026-11-01' }));
const platforms = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, nombre: `Platform ${i + 1}`, cantidad_pantallas: 5 }));
const source = fs.readFileSync(path.join(__dirname, '../src/components/viewers/PantallasViewer.tsx'), 'utf8');
const dates = require('../lib/bogotaDate.ts');
const counts = require('../lib/cantidadPantallasDisponibles.ts');
function measure(fn) {
  fn();
  const samples = Array.from({ length: 5 }, () => { const start = performance.now(); fn(); return performance.now() - start; }).sort((a,b) => a-b);
  return { medianMs: +samples[2].toFixed(3), maxMs: +samples[4].toFixed(3) };
}
async function main() {
  const start = source.indexOf('  const filtered = useMemo(');
  const end = source.indexOf('  const overview =', start);
  // Compile outside timings so TypeScript parsing does not pollute measurements.
  const filterJs = ts.transpileModule(source.slice(start,end) + '\nreturn filtered;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const runFilter = new Function('useMemo','rows','q','platFilter','quickFilter','normSearch','todayYMDBogota','addDaysYMD', filterJs);
  const filterCall = () => runFilter(fn => fn(),rows,'','all','all',s => String(s ?? '').toLowerCase(),dates.todayYMDBogota,dates.addDaysYMD);
  const badgeStart = source.indexOf('  const platformsByEmail = useMemo(');
  const functionStart = source.indexOf('  function getPerPlatformForEmail(');
  const badgeEnd = source.indexOf('  // Agrupar por correo', functionStart);
  const badgeSnippet = source.slice(badgeStart >= 0 ? badgeStart : functionStart, badgeEnd);
  const badgeJs = ts.transpileModule(badgeSnippet + '\nreturn getPerPlatformForEmail;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const runBadges = new Function('useMemo','rows','usedByEmailPlat','buildPidEmailKey','capacityByPlatform','platCaps','plataformas','nameByPlatform', badgeJs);
  const badgeCall = () => {
    const fn = runBadges(fn => fn(), rows, counts.computeUsedByEmailPlatform(rows), counts.buildPidEmailKey, new Map(platforms.map(p => [p.id,5])),new Map(),platforms,new Map(platforms.map(p => [p.id,p.nombre])));
    return Array.from({length:2000},(_,i) => fn(`user${i}@example.test`));
  };
  global.prisma = { pantallas: { findMany: async ({take}) => rows.slice(0,take).map(row => ({ ...row, fecha_vencimiento: new Date(row.fecha_vencimiento) })) }, cuentascompletas: { findMany: async ({take}) => rows.slice(0,take).map(row => ({ ...row, fecha_vencimiento: new Date(row.fecha_vencimiento) })) } };
  const routes = { pantallas: require('../src/app/api/pantallas/route.ts'), cuentascompletas: require('../src/app/api/cuentascompletas/route.ts') };
  const paging = {};
  for (const [name, route] of Object.entries(routes)) {
    const result = await route.GET(new Request(`http://localhost/api/${name}`));
    const body = await result.json();
    paging[name] = { status: result.status, defaultPageRows: body.items.length };
  }
  const result = { environment: 'synthetic; no MySQL, HTTP transport or browser rendering', node:process.version, rows:rows.length, groups:2000, filter:measure(filterCall), badges:measure(badgeCall), paging };
  const out = process.argv[2];
  if (out) fs.writeFileSync(out, JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
main().catch(error => { console.error(error); process.exitCode=1; });
