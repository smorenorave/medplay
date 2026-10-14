/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node regression. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { parseWhatsAppContact } = require('../scripts/whatsapp-contact');
const { exclusionReason } = require('../scripts/whatsapp-delivery.cjs');
const source = fs.readFileSync(path.join(__dirname, '../scripts/enviar_vencidos.js'), 'utf8');
const ast = ts.createSourceFile('script.js', source, ts.ScriptTarget.Latest, true);
const fn = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast);
function fixture(t, overrides = {}) {
  fs.mkdirSync(path.join(__dirname, '../.logs'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(__dirname, '../.logs/medplay-controls-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const context = { fs, path, parseWhatsAppContact, exclusionReason, LOCAL_MODE: false, USERNAME_MODE: false,
    SEND_LOG_FILE: path.join(dir, 'envios_log.jsonl'), LOG_DIR: dir, LOCAL_DIR: dir,
    todayStr: () => '2026-10-13', console: { log() {}, warn: console.warn }, ...overrides };
  vm.createContext(context);
  const load = vm.runInContext(`(${fn('loadSentPhones')})`, context);
  const archive = vm.runInContext(`(${fn('archivarYReiniciarLogDelDia')})`, context);
  const write = (name, events) => fs.writeFileSync(path.join(dir, name), events.map(e => JSON.stringify(e)).join('\n') + '\n');
  return { dir, context, load, archive, write };
}
const sent = (phone, date = '2026-10-13') => ({ phone, date, status: 'ENVIADO' });
test('completed batch and second archived batch still suppress same-day sends with missing or empty active log', t => {
  const f = fixture(t);
  f.write('envios_log.jsonl', [sent('573001234567')]);
  f.archive();
  assert.deepEqual([...f.load()], ['573001234567']);
  f.write('envios_log.jsonl', [sent('573009876543')]);
  f.archive();
  assert.deepEqual([...f.load()].sort(), ['573001234567', '573009876543']);
});
test('merges active and archive, normalizes contacts, respects daily scope and success status', t => {
  const f = fixture(t);
  f.write('envios_log.jsonl', [sent('573001234567'), sent('573001111111', '2026-10-12'), { ...sent('573002222222'), status: 'ERROR' }]);
  f.write('envios_log_2026-10-13.jsonl', [sent('+57 300 1234567'), sent('@Some.User')]);
  assert.deepEqual([...f.load()].sort(), ['573001234567', 'some.user']);
  f.context.todayStr = () => '2026-10-14';
  assert.equal(f.load().size, 0, 'next day remains eligible');
});
test('no history is valid; corrupt or unreadable history stops instead of risking duplicate delivery', t => {
  const f = fixture(t);
  assert.equal(f.load().size, 0);
  fs.writeFileSync(path.join(f.dir, 'envios_log_2026-10-13.jsonl'), '{broken');
  assert.throws(f.load, /JSON|property/i);
  f.context.fs = { readFileSync() { throw Object.assign(new Error('permission denied'), { code: 'EACCES' }); } };
  assert.throws(f.load, /permission denied/);
});
test('local history keeps prior scope and statuses without reading database archives', t => {
  const f = fixture(t, { LOCAL_MODE: true });
  f.write('envios_log.jsonl', [sent('573001234567', '2026-10-12'), { ...sent('some.user'), status: 'OMITIDO' }]);
  fs.writeFileSync(path.join(f.dir, 'envios_log_2026-10-13.jsonl'), '{broken');
  assert.deepEqual([...f.load()].sort(), ['573001234567', 'some.user']);
  f.context.USERNAME_MODE = true;
  assert.deepEqual([...f.load()], ['573001234567']);
});
// Execute the actual main recipient filter, without opening WhatsApp or MySQL.
let filter;
function visit(node) {
  if (ts.isForOfStatement(node) && node.expression.getText(ast) === 'allRecipients') filter = node.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
function filterRecipients(f, recipients) {
  f.context.allRecipients = recipients;
  f.context.sentPhones = f.load();
  f.context.events = [];
  f.context.appendSendLog = event => f.context.events.push(event);
  return vm.runInContext(`(() => { const recipients = []; let omitidosPrevios = 0; ${filter}; return { recipients, omitidosPrevios }; })()`, f.context);
}
test('database phone opt-out and duplicate are logged individually; next eligible contact continues', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.dir, 'no-contactar.json'), JSON.stringify(['+57 300 1234567', '@Some.User']));
  f.write('envios_log_2026-10-13.jsonl', [sent('573002222222')]);
  const result = filterRecipients(f, ['573001234567', 'some.user', '573002222222', '573003333333'].map(phone => ({ phone, text: 'Hola' })));
  assert.equal(result.omitidosPrevios, 3);
  assert.equal(result.recipients.length, 1);
  assert.equal(result.recipients[0].phone, '573003333333');
  assert.deepEqual(f.context.events.map(e => e.motivo), ['solicitud_no_contactar', 'solicitud_no_contactar', 'ya_enviado_previamente']);
  assert.ok(f.context.events.every(e => e.status === 'OMITIDO'));
});
test('invalid opt-out configuration stops database recipient filtering', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.dir, 'no-contactar.json'), JSON.stringify({ phone: '573001234567' }));
  assert.throws(() => filterRecipients(f, [{ phone: '573001234567', text: 'Hola' }]), /Lista inválida/);
});
