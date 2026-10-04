/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test verifies the plugin's require() entry point. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Linter } = require('eslint');
const { getRootDirs } = require(path.join(
  path.dirname(require.resolve('@next/eslint-plugin-next')),
  'utils/get-root-dirs.js',
));

const repoRoot = path.resolve(__dirname, '..');
const context = (rootDir) => ({
  cwd: repoRoot,
  settings: { next: rootDir === undefined ? {} : { rootDir } },
});
const normalize = (dirs) => dirs.map((dir) => path.resolve(dir)).sort();

test('Next.js conserva el directorio por defecto y acepta rutas Windows', () => {
  assert.deepEqual(getRootDirs(context()), [repoRoot]);
  assert.deepEqual(normalize(getRootDirs(context(repoRoot.replaceAll('/', '\\')))), [repoRoot]);
});

test('Next.js resuelve comodines, listas y llaves; excluye archivos', () => {
  const expected = fs.readdirSync(path.join(repoRoot, 'src'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(repoRoot, 'src', entry.name)).sort();
  assert.deepEqual(normalize(getRootDirs(context(path.join(repoRoot, 'src', '*')))), expected);
  const roots = [path.join(repoRoot, 'src'), path.join(repoRoot, 'lib')];
  assert.deepEqual(normalize(getRootDirs(context(roots))), normalize(roots));
  assert.deepEqual(normalize(getRootDirs(context(`${repoRoot.replaceAll('\\', '/')}/{src,lib}`))), normalize(roots));
  assert.deepEqual(getRootDirs(context(path.join(repoRoot, 'package.json'))), []);
  assert.deepEqual(getRootDirs(context(path.join(repoRoot, 'nonexistent-root-*'))), []);
});

test('ESLint sigue detectando enlaces internos sin next/link con rootDir explícito', () => {
  const plugin = require('@next/eslint-plugin-next');
  const linter = new Linter();
  const messages = linter.verify(
    'export default function Example() { return <a href="/">Inicio</a>; }',
    {
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      settings: { next: { rootDir: repoRoot } },
      plugins: { '@next/next': plugin },
      rules: { '@next/next/no-html-link-for-pages': 'error' },
    },
  );
  assert.ok(messages.some((message) =>
    message.ruleId === '@next/next/no-html-link-for-pages' && message.severity === 2,
  ), JSON.stringify(messages));
});
