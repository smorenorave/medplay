const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const { deliverUsername, exclusionReason } = require('../scripts/whatsapp-delivery.cjs');
const { headerMatchesUsername, restrictionReason, sendUsernameMessage, openUsernameChat } = require('../scripts/whatsapp-username.cjs');
const { buildWhatsAppChatUrls, parseWhatsAppContact } = require('../scripts/whatsapp-contact');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'medplay-wa-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const events = [];
  return { directory, scope: '2026-10-13', page: {}, recipient: { phone: 'Some.User', text: 'Hola, renovación' },
    openChat: async () => true, send: async () => ({ confirmed: true }), log: event => events.push(event), events };
}

test('business queries, formatting and telephone send functions remain byte-identical to pre-integration', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/enviar_vencidos.js'), 'utf8');
  const ast = ts.createSourceFile('script.js', source, ts.ScriptTarget.Latest, true);
  const expected = require('./vencidos-preserved-functions.json');
  for (const [name, hash] of Object.entries(expected)) {
    const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.ok(node, name);
    assert.equal(crypto.createHash('sha256').update(node.getText(ast).replace(/\r\n/g, '\n')).digest('hex'), hash, name);
  }
});

test('phone URLs unchanged and username URL preserves message encoding', () => {
  assert.equal(parseWhatsAppContact('+57 300 1234567').type, 'phone');
  assert.equal(parseWhatsAppContact('@Some.User').type, 'username');
  const text = encodeURIComponent('Hola\n$ 4.900 & renovación');
  assert.deepEqual(buildWhatsAppChatUrls('+57 300 1234567', text), [
    `https://web.whatsapp.com/send?phone=573001234567&text=${text}`,
    `https://web.whatsapp.com/send/?phone=573001234567&text=${text}`,
    `https://web.whatsapp.com/send?phone=573001234567&text=${text}&app_absent=0`,
  ]);
  assert.equal(buildWhatsAppChatUrls('@Some.User', text)[0], `https://wa.me/Some.User?text=${text}`);
});

test('successful send is logged before and after Enter; duplicate and case variation blocked', async t => {
  const f = fixture(t); let calls = 0;
  f.send = async () => { calls++; assert.equal(f.events.at(-1).status, 'EN_PROCESO'); return { confirmed: true }; };
  assert.equal((await deliverUsername(f)).status, 'ENVIADO');
  assert.equal((await deliverUsername({ ...f, recipient: { ...f.recipient, phone: 'some.user' } })).status, 'OMITIDO');
  assert.equal(calls, 1);
  assert.equal((await deliverUsername({ ...f, scope: '2026-10-14' })).status, 'ENVIADO');
});

test('parallel attempts claim recipient once', async t => {
  const f = fixture(t); let calls = 0;
  f.send = async () => { calls++; return { confirmed: true }; };
  const results = await Promise.all([deliverUsername(f), deliverUsername(f)]);
  assert.equal(calls, 1); assert.deepEqual(results.map(r => r.status).sort(), ['ENVIADO', 'OMITIDO']);
});

test('inaccessible user skipped and next recipient still sent', async t => {
  const f = fixture(t);
  assert.equal((await deliverUsername({ ...f, openChat: async () => false })).status, 'OMITIDO');
  assert.equal((await deliverUsername({ ...f, recipient: { phone: 'another', text: 'Hola' } })).status, 'ENVIADO');
});

test('uncertain send and errors never automatically retried', async t => {
  const f = fixture(t); let calls = 0;
  f.send = async () => { calls++; throw new Error('Connection lost after Enter'); };
  assert.equal((await deliverUsername(f)).motivo, 'envio_incierto_revisar_manualmente');
  assert.equal((await deliverUsername(f)).status, 'OMITIDO'); assert.equal(calls, 1);
});

test('restrictions and opt-out lists retain precise reasons', async t => {
  const f = fixture(t);
  for (const [message, reason] of [['Enter username key', 'requiere_clave_usuario'], ['You blocked this contact', 'contacto_restringido'], ['Usuario no existe', 'usuario_no_disponible'], ['Try again later', 'limite_plataforma']]) {
    assert.equal(restrictionReason(message), reason);
  }
  assert.equal(restrictionReason('Chat available'), null);
  fs.writeFileSync(path.join(f.directory, 'no-contactar.json'), JSON.stringify(['@Some.User', '+57 300 1234567']));
  assert.equal(exclusionReason('some.user', f.directory), 'solicitud_no_contactar');
  assert.equal(exclusionReason('573001234567', f.directory), 'solicitud_no_contactar');
  assert.equal(exclusionReason('another', f.directory), null);
  const result = await deliverUsername({ ...f, openChat: async () => { throw Object.assign(new Error(), { omitReason: 'requiere_clave_usuario' }); } });
  assert.equal(result.status, 'OMITIDO'); assert.equal(result.motivo, 'requiere_clave_usuario');
});

test('exact username identity, no partial matches', () => {
  assert.ok(headerMatchesUsername('@G3.German\nInfo', 'G3.German'));
  assert.ok(!headerMatchesUsername('@G3xGerman', 'G3.German'));
  assert.ok(!headerMatchesUsername('@G3.German2', 'G3.German'));
});

test('username sender refuses different draft, sends matching draft and observes cleared editor', async () => {
  let text = 'Incorrecto', presses = 0;
  const editor = { last() { return this; }, async waitFor() {}, async innerText() { return text; }, async press() { presses++; text = ''; } };
  const page = { locator() { return editor; } };
  await assert.rejects(sendUsernameMessage(page, 'Hola'), /mensaje_no_coincide/);
  assert.equal(presses, 0); text = 'Hola';
  assert.equal((await sendUsernameMessage(page, 'Hola')).confirmed, true);
  assert.equal(presses, 1);
});

test('official username redirect keeps recipient and message; identity verified before filling', async () => {
  let current, filled, visited = [];
  const editor = { last() { return this; }, async isVisible() { return true; }, async fill(text) { filled = text; } };
  const page = {
    async goto(url) { visited.push(url); current = url.startsWith('https://wa.me/') ? 'https://api.whatsapp.com/send/?username=Some.User&type=username' : url; },
    url() { return current; },
    getByRole() { return { async allTextContents() { return []; } }; },
    locator(selector) {
      if (selector.includes('footer')) return editor;
      if (selector.includes('header')) return { async innerText() { return '@Some.User'; } };
      if (selector.includes('message-out')) return { async allTextContents() { return []; } };
      throw Error(`Unexpected locator ${selector}`);
    },
  };
  assert.equal(await openUsernameChat(page, 'Some.User', 'Hola & renovación'), true);
  const target = new URL(visited[1]);
  assert.equal(target.hostname, 'web.whatsapp.com');
  assert.equal(target.searchParams.get('username'), 'Some.User');
  assert.equal(target.searchParams.get('text'), 'Hola & renovación');
  assert.equal(filled, 'Hola & renovación');
  page.getByRole = () => ({ async allTextContents() { return ['Username not found']; } });
  await assert.rejects(openUsernameChat(page, 'Some.User', 'Hola'), error => error.omitReason === 'usuario_no_disponible');
});

test('mixed batch dispatches username through shared module and phone through original flow', async () => {
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../scripts/enviar_vencidos.js'), 'utf8');
  const ast = ts.createSourceFile('script.js', source, ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'sendAll').getText(ast);
  const calls = [], events = [];
  const context = {
    console: { log() {}, warn() {}, error() {} },
    openFreshSession: async () => ({ page: { isClosed: () => false } }),
    parseWhatsAppContact, deliverUsername: async ({ recipient }) => { calls.push(`username:${recipient.phone}`); return { status: 'OMITIDO', motivo: 'contacto_restringido' }; },
    sendUsernameMessage, LOCAL_MODE: false, LOG_DIR: '.', path, todayStr: () => '2026-10-13',
    appendSendLog: event => events.push(event), RESTART_EVERY: 15, GAP_BETWEEN_CONTACTS: 18000,
    sleep: async () => {}, MAX_ATTEMPTS_PER_CONTACT: 3, MAX_CONSECUTIVE_BROKEN_SESSIONS: 5,
    ensureChatReady: async (_, phone) => { calls.push(`phone:${phone}`); return true; },
    sendMessage: async () => ({ confirmed: true }),
  };
  vm.createContext(context);
  const run = vm.runInContext(`(${fn})`, context);
  const result = await run([{ phone: 'some.user', text: 'Hola' }, { phone: '573001234567', text: 'Hola' }], new Set());
  assert.deepEqual(calls, ['username:some.user', 'phone:573001234567']);
  assert.equal(result.enviados, 1); assert.equal(result.omitidos, 1); assert.equal(result.pendientes, 0);
});
