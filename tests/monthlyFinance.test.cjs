/* eslint-disable @typescript-eslint/no-require-imports -- Node regression tests. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const dates = require('../lib/bogotaDate.ts');
const { periodKey } = require('../lib/monthlySnapshots.ts');

test('Bogota month ends at 05:00 UTC, including year changes', () => {
  assert.equal(dates.todayYMDBogota(new Date('2027-01-01T04:59:59Z')), '2026-12-31');
  assert.equal(dates.todayYMDBogota(new Date('2027-01-01T05:00:00Z')), '2027-01-01');
  assert.equal(periodKey(2026, 7), '2026-07');
  assert.throws(() => periodKey(2026, 13));
});

function scheduler(runtime = 'nodejs', phase = '') {
  const calls = []; let closes = 0; let fail = false;
  const code = ts.transpileModule(fs.readFileSync('instrumentation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, global: {}, process: { env: { NEXT_RUNTIME: runtime, NEXT_PHASE: phase } }, console: { error: (...args) => calls.push(['error', ...args]) }, require: name => {
    if (name === 'node-cron') return { default: { schedule: (...args) => calls.push(args) } };
    if (name === '@/lib/monthlySnapshots') return { refreshAutomaticSnapshots: async () => { closes++; if (fail) throw Error('test interruption'); } };
    throw Error('Unexpected dependency ' + name);
  } };
  vm.runInNewContext(code, context);
  return { context, calls, closes: () => closes, fail: value => { fail = value; } };
}

test('server startup and scheduled retries work without a page, once per worker', async () => {
  const h = scheduler();
  await h.context.exports.register();
  await h.context.exports.register();
  assert.equal(h.closes(), 1);
  assert.equal(h.calls.length, 1);
  const [expression, tick, options] = h.calls[0];
  assert.equal(expression, '*/5 * * * *'); assert.equal(options.timezone, 'America/Bogota'); assert.equal(options.noOverlap, true);
  h.fail(true); await tick(); assert.equal(h.closes(), 2); assert.equal(h.calls[1][0], 'error');
  h.fail(false); await tick(); assert.equal(h.closes(), 3);
});

test('build and edge runtimes never start financial jobs', async () => {
  for (const h of [scheduler('edge'), scheduler('nodejs', 'phase-production-build')]) {
    await h.context.exports.register(); assert.equal(h.calls.length, 0); assert.equal(h.closes(), 0);
  }
});
