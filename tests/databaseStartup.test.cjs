/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS startup regression tests. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { prepareDatabase } = require('../scripts/prepare-database.cjs');
const pkg = require('../package.json');

function harness(result = { status: 0 }) {
  const calls = [];
  const messages = [];
  const env = {};
  const root = path.resolve('server with spaces');
  return {
    calls, messages, env, root,
    dependencies: {
      root, env,
      log: { info: m => messages.push(m), error: m => messages.push(m) },
      loadEnvConfig: (dir, dev) => { calls.push(['env', dir, dev]); env.DATABASE_URL = 'mysql://private-connection'; },
      resolveCli: () => path.join(root, 'node_modules/prisma/build/index.js'),
      spawnSync: (...args) => { calls.push(['run', ...args]); return result; },
    },
  };
}

test('PM2 npm entry points run database preparation before Next', () => {
  assert.equal(pkg.scripts.predev, 'node scripts/prepare-database.cjs development');
  assert.equal(pkg.scripts.prestart, 'node scripts/prepare-database.cjs production');
  assert.equal(pkg.scripts.dev, 'next dev -p 3000');
  assert.equal(pkg.scripts.start, 'next start');
});

for (const mode of ['development', 'production']) {
  test(`${mode}: loads Next environment before deploying migrations with the installed CLI`, () => {
    const h = harness();
    assert.equal(prepareDatabase(mode, h.dependencies), 0);
    assert.deepEqual(h.calls[0], ['env', h.root, mode === 'development']);
    const [, executable, args, options] = h.calls[1];
    assert.equal(executable, process.execPath);
    assert.deepEqual(args, [path.join(h.root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', path.join(h.root, 'prisma/schema.prisma')]);
    assert.equal(options.env, h.env);
    assert.equal(options.cwd, h.root);
    assert.equal(options.shell, false);
    assert.equal(options.windowsHide, true);
  });
}

for (const result of [{ status: 1 }, { status: null, signal: 'SIGTERM' }, { error: new Error('cannot spawn') }]) {
  test(`blocks startup when migration fails: ${JSON.stringify(result)}`, () => {
    const h = harness(result);
    assert.equal(prepareDatabase('production', h.dependencies), 1);
    assert.equal(h.calls.length, 2);
    assert.ok(!h.messages.join('\n').includes(h.env.DATABASE_URL));
  });
}

test('missing connection blocks startup without launching Prisma', () => {
  const h = harness();
  h.dependencies.loadEnvConfig = () => {};
  assert.equal(prepareDatabase('development', h.dependencies), 1);
  assert.equal(h.calls.length, 0);
});

test('missing Prisma CLI fails closed without exposing exception contents', () => {
  const h = harness();
  h.dependencies.resolveCli = () => { throw new Error(h.env.DATABASE_URL); };
  assert.equal(prepareDatabase('production', h.dependencies), 1);
  assert.equal(h.calls.length, 1);
  assert.ok(!h.messages.join('\n').includes(h.env.DATABASE_URL));
});

test('invalid mode never touches the database', () => {
  const h = harness();
  assert.equal(prepareDatabase('invalid', h.dependencies), 1);
  assert.equal(h.calls.length, 0);
});
