#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
const fileIndex = args.indexOf('--archivo');
const file = fileIndex >= 0 ? args[fileIndex + 1] : path.join(__dirname, '../.local-vencidos/datos.json');
const flags = args.filter((_, index) => index !== fileIndex && (fileIndex < 0 || index !== fileIndex + 1));
if (!file || file.startsWith('--') || flags.some(arg => !['--enviar', '--preview', '--usuarios'].includes(arg)) ||
    (args.includes('--enviar') && args.includes('--preview'))) {
  console.error('Uso: node scripts/enviar_vencidos_local.cjs [--preview | --enviar] [--usuarios] [--archivo ruta]');
  process.exit(1);
}
const result = spawnSync(process.execPath, [
  path.join(__dirname, 'enviar_vencidos.js'), '--archivo',
  path.resolve(file),
  args.includes('--enviar') ? '--enviar' : '--preview',
  ...(args.includes('--usuarios') ? ['--usuarios'] : []),
], { stdio: 'inherit', windowsHide: true });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
