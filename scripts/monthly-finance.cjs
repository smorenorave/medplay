/* Operator-only tool. No write occurs without --apply and an explicit period confirmation. */
const fs = require('node:fs');
require('@next/env').loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { prisma } = require('../lib/db.ts');
const args = process.argv.slice(2);
const option = key => args[args.indexOf(key) + 1];
async function main() {
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL no configurada. No se ha consultado ni modificado producción.');
  if (args.includes('--apply')) {
    for (const key of ['--file', '--actor', '--reason', '--evidence', '--expected-revision', '--confirm-period']) {
      if (!args.includes(key) || !option(key)) throw Error(`Falta ${key}`);
    }
    const input = JSON.parse(fs.readFileSync(option('--file'), 'utf8'));
    if (`${input.year}-${String(input.month).padStart(2, '0')}` !== option('--confirm-period')) throw Error('Confirmación de período incorrecta.');
    const { reviseVerifiedSnapshot } = require('../lib/monthlySnapshotRevisions.ts');
    const period = await reviseVerifiedSnapshot(input, option('--actor'), option('--reason'), option('--evidence'), option('--expected-revision'));
    console.log(JSON.stringify({ applied: period }));
    return;
  }
  const year = Number(args.includes('--year') ? option('--year') : 2026);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw Error('Año inválido.');
  const rows = await prisma.metricasmensuales.findMany({ where: { year }, orderBy: { month: 'asc' } });
  // No emails, credentials or operational customer records in this report.
  console.log(JSON.stringify({ year, snapshots: rows.map(r => ({ period: r.periodLabel, total: String(r.totalGeneral), units: r.ventasCantidad, createdAt: r.createdAt, updatedAt: r.updatedAt, hasPayload: !!r.payload })),
    missing: Array.from({ length: 12 }, (_, i) => i + 1).filter(m => !rows.some(r => r.month === m)),
    warning: 'La existencia de un snapshot anterior no demuestra su integridad. Coteje respaldos y auditorías; no reconstruya totales desde cuentas actuales.' }, null, 2));
  const tables = await prisma.$queryRaw`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('financialCoverage','monthlySnapshotRevision','monthlyCloseLog')`;
  if (tables.length === 3) {
    console.log(JSON.stringify({ coverage: await prisma.$queryRaw`SELECT * FROM financialCoverage`,
      revisions: await prisma.$queryRaw`SELECT CAST(id AS CHAR) id,periodLabel,actor,reason,evidence,createdAt FROM monthlySnapshotRevision ORDER BY id`,
      closes: await prisma.$queryRaw`SELECT CAST(id AS CHAR) id,periodLabel,status,result,createdAt FROM monthlyCloseLog ORDER BY id DESC LIMIT 100` }, null, 2));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
