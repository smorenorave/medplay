const path = require('node:path');
const { spawnSync } = require('node:child_process');

// npm runs this before both entry points used by PM2. Never reset or push
// the schema: deploy applies only migrations recorded in the repository.
function prepareDatabase(mode, dependencies = {}) {
  const root = dependencies.root || path.resolve(__dirname, '..');
  const env = dependencies.env || process.env;
  const log = dependencies.log || console;
  const loadEnvConfig = dependencies.loadEnvConfig || require('@next/env').loadEnvConfig;
  const run = dependencies.spawnSync || spawnSync;
  const resolveCli = dependencies.resolveCli || (() => require.resolve('prisma/build/index.js'));

  if (!['development', 'production'].includes(mode)) {
    log.error('[database] Modo de inicio inválido.');
    return 1;
  }

  try {
    // Match Next's .env.local / .env.<mode> precedence and existing PM2 env.
    loadEnvConfig(root, mode === 'development');
    if (!env.DATABASE_URL) {
      log.error('[database] Falta DATABASE_URL en el entorno del servidor. No se inicia la aplicación.');
      return 1;
    }

    log.info('[database] Aplicando migraciones pendientes antes de iniciar Medplay...');
    const result = run(process.execPath, [resolveCli(), 'migrate', 'deploy', '--schema', path.join(root, 'prisma', 'schema.prisma')], {
      cwd: root,
      env,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    });
    if (result.error || result.signal || result.status !== 0) {
      log.error('[database] La migración falló. Revise el error de Prisma en PM2. No se inicia la aplicación ni se reinicia la base de datos.');
      return 1;
    }
    log.info('[database] Migraciones al día. Iniciando Medplay.');
    return 0;
  } catch {
    // Do not print environment values or connection strings.
    log.error('[database] No se pudo preparar la base de datos. Verifique la configuración y que las dependencias de Prisma estén instaladas.');
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = prepareDatabase(process.argv[2]);
}

module.exports = { prepareDatabase };
