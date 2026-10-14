/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node regression tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { spawnSync } = require('node:child_process');
const code = ts.transpileModule(fs.readFileSync('lib/bogotaDate.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, Date, Intl }; vm.runInNewContext(code, context);
const { formatDateCO, parseDateCO, addDaysYMD, isCivilDate, utcDateFromYMD } = context.exports;
test('Colombia midnight, ambiguous dates, leap dates and calendar arithmetic in all zones', () => {
  for (const zone of ['America/Bogota', 'America/New_York', 'America/Los_Angeles', 'Pacific/Honolulu']) {
    const run = spawnSync(process.execPath, ['-e', `const exports={}; ${code};
      const assert=require('node:assert/strict');
      assert.equal(exports.todayYMDBogota(new Date('2026-10-14T02:30:00Z')), '2026-10-13');
      assert.equal(exports.todayYMDBogota(new Date('2026-10-14T05:30:00Z')), '2026-10-14');
      assert.equal(exports.parseDateCO('05/08/2026'), '2026-08-05');
      assert.equal(exports.formatDateCO('2026-08-05T00:00:00Z'), '05/08/2026');
      assert.equal(exports.addMonthsYMD('2026-01-31', 1), '2026-02-28');
      assert.equal(exports.addMonthsYMD('2028-01-31', 1), '2028-02-29');
      assert.equal(exports.addDaysYMD('2026-03-08', 1), '2026-03-09');
      assert.equal(exports.utcDateFromYMD('2026-08-05').toISOString().slice(0,10), '2026-08-05');
    `], { env: { ...process.env, TZ: zone }, encoding: 'utf8' });
    assert.equal(run.status, 0, zone + ': ' + run.stderr);
  }
});
test('rejects invalid or US-only input without swapping month/day', () => {
  for (const value of ['02/31/2026', '31/02/2026', '08/13/2026', '2026-08-05']) assert.equal(parseDateCO(value), '');
  assert.equal(parseDateCO('13/08/2026'), '2026-08-13');
  assert.equal(isCivilDate('2026-02-29'), false);
  assert.equal(isCivilDate('2028-02-29'), true);
  assert.equal(formatDateCO('2026-08-05'), '05/08/2026');
});
test('all historical civil dates roundtrip through storage without timezone conversion', () => {
  for(let day = '2024-01-01'; day <= '2027-12-31'; day = addDaysYMD(day, 1)) {
    assert.equal(parseDateCO(formatDateCO(day)), day);
    assert.equal(utcDateFromYMD(day).toISOString().slice(0, 10), day);
  }
});
