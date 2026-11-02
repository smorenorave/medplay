import { serializable } from './emailDeletion';
import { prisma } from './db';
import { todayYMDBogota } from './bogotaDate';
import type { Prisma } from '../src/generated/prisma';

const pad2 = (n: number) => String(n).padStart(2, '0');
const money = (v: unknown) => Number(v == null ? 0 : String(v));
const cents = (v: unknown) => {
  const value = Math.round(money(v) * 100);
  if (!Number.isSafeInteger(value)) throw Error('Importe fuera del rango financiero seguro.');
  return value;
};
export function periodKey(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) throw Error('invalid-period');
  return `${year}-${pad2(month)}`;
}
export class MissingHistoricalSnapshot extends Error {}
type LedgerRow = { id: bigint; tipo: string; sourceId: string; fecha: Date; vence: Date | null; contacto: string; plataformaId: number | null; plataforma: string; ingreso: unknown; costo: unknown; unidades: number };

export async function buildMonthlyData(tx: Prisma.TransactionClient, year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const sales = await tx.$queryRaw<LedgerRow[]>`SELECT * FROM financialSale WHERE fecha >= ${start} AND fecha < ${end} ORDER BY id`;
  const days = Array.from({ length: new Date(Date.UTC(year, month, 0)).getUTCDate() }, (_, i) => ({ day: pad2(i + 1), total: 0, pantallas: 0, completas: 0 }));
  const ranking = new Map<string, { name: string; pid: number | null; count: number; total: number }>();
  let screens = 0, accounts = 0, screenIncome = 0, accountIncome = 0, costs = 0;
  for (const sale of sales) {
    const amount = cents(sale.ingreso);
    const d = days[sale.fecha.getUTCDate() - 1];
    d.total += amount;
    if (sale.tipo === 'P') { d.pantallas += amount; screenIncome += amount; screens += sale.unidades; }
    else { d.completas += amount; accountIncome += amount; accounts += sale.unidades; }
    costs += cents(sale.costo);
    const key = `${sale.plataformaId}:${sale.plataforma}`;
    const r = ranking.get(key) ?? { name: sale.plataforma, pid: sale.plataformaId, count: 0, total: 0 };
    r.count += sale.unidades; r.total += amount; ranking.set(key, r);
  }
  // Count distinct sold service holders, independently of account deletion/cascades.
  const threshold = periodKey(year, month) === todayYMDBogota().slice(0, 7)
    ? new Date(`${todayYMDBogota()}T00:00:00Z`) : new Date(end.getTime() - 86400000);
  const active = await tx.$queryRaw<{ count: bigint }[]>`SELECT COUNT(DISTINCT contacto) AS count FROM financialSale WHERE fecha <= ${threshold} AND vence > ${threshold} AND unidades = 1`;
  const income = screenIncome + accountIncome;
  return {
    year, month, periodLabel: periodKey(year, month), totalGeneral: (income / 100).toFixed(2),
    totalPantallas: (screenIncome / 100).toFixed(2), totalCuentas: (accountIncome / 100).toFixed(2),
    ventasCantidad: screens + accounts, pantallasVendidas: screens, cuentasVendidas: accounts,
    clientesActivos: Number(active[0]?.count ?? 0), ranking: [...ranking.values()].sort((a, b) => b.count - a.count || b.total - a.total).map(r => ({ ...r, total: r.total / 100 })),
    ventasDias: days.map(d => ({ ...d, total: d.total / 100, pantallas: d.pantallas / 100, completas: d.completas / 100 })),
    payload: {
      schemaVersion: 2, generatedBy: 'permanent-ledger', costos: costs / 100, ganancia_neta: (income - costs) / 100,
      clientesDefinition: 'Contactos únicos con servicio vendido vigente al cierre (vencimiento exclusivo)',
      ventas_dia_plataforma: sales.map(s => ({ day: pad2(s.fecha.getUTCDate()), pid: s.plataformaId, tipo: s.tipo, total: money(s.ingreso) })),
      registros: sales.map(s => ({ id: String(s.id), tipo: s.tipo, sourceId: s.sourceId, fecha: s.fecha.toISOString().slice(0, 10), plataforma: s.plataforma, ingreso: money(s.ingreso), costo: money(s.costo), unidades: s.unidades })),
    },
  };
}

// Reads never create history from mutable account rows.
export async function ensureMonthlySnapshot(year: number, month: number) {
  const key = periodKey(year, month);
  if (key === todayYMDBogota().slice(0, 7)) return serializable(prisma, async tx => ({ id: 0, ...await buildMonthlyData(tx, year, month), createdAt: new Date(), updatedAt: new Date() }));
  if (key > todayYMDBogota().slice(0, 7)) throw new MissingHistoricalSnapshot('El período todavía no ha comenzado.');
  const row = await prisma.metricasmensuales.findUnique({ where: { year_month: { year, month } } });
  if (!row) throw new MissingHistoricalSnapshot('No existe cierre verificable para este mes. Se requiere recuperación desde un respaldo o registro financiero completo.');
  const revisions = await prisma.$queryRaw<{ replacement: unknown; createdAt: Date }[]>`SELECT replacement, createdAt FROM monthlySnapshotRevision WHERE periodLabel = ${key} ORDER BY id DESC LIMIT 1`;
  if (!revisions[0]) {
    const openCache = await prisma.$queryRaw<{ id: bigint }[]>`SELECT id FROM monthlyCloseLog WHERE periodLabel = ${key} AND status = 'unclosed_legacy' LIMIT 1`;
    if (openCache.length) throw new MissingHistoricalSnapshot('El registro anterior era una caché del mes abierto. Falta un cierre completo o una conciliación verificable.');
    return row;
  }
  const replacement = typeof revisions[0].replacement === 'string' ? JSON.parse(revisions[0].replacement) : revisions[0].replacement;
  return { ...row, ...replacement, id: row.id, createdAt: row.createdAt, updatedAt: revisions[0].createdAt } as typeof row;
}

export async function generateMonthlySnapshot(year: number, month: number) {
  const key = periodKey(year, month);
  if (key >= todayYMDBogota().slice(0, 7)) throw Error('El mes debe haber terminado en America/Bogota.');
  try {
    return await serializable(prisma, async tx => {
      // Database lock coordinates multiple workers and interrupted startup catch-up.
      const coverage = await tx.$queryRaw<{ firstCompleteMonth: string }[]>`SELECT firstCompleteMonth FROM financialCoverage WHERE id = 1 FOR UPDATE`;
      const existing = await tx.metricasmensuales.findUnique({ where: { year_month: { year, month } } });
      if (existing) {
        if (!coverage[0] || key < coverage[0].firstCompleteMonth) return existing;
        const revisions = await tx.$queryRaw<{ id: bigint }[]>`SELECT id FROM monthlySnapshotRevision WHERE periodLabel = ${key} LIMIT 1`;
        const payload = existing.payload as Record<string, unknown> | null;
        if (payload?.generatedBy === 'permanent-ledger' || revisions.length) return existing;
        // Only periods that were future at migration can reach this branch.
        // Keep the old cache intact and append its definitive, auditable close.
        const replacement = await buildMonthlyData(tx, year, month);
        await tx.$executeRaw`INSERT INTO monthlySnapshotRevision (periodLabel,actor,reason,evidence,replacement) VALUES (${key},'system','Cierre definitivo de caché anterior al período cubierto','Registro permanente completo desde la migración',${JSON.stringify(replacement)})`;
        await tx.$executeRaw`INSERT INTO monthlyCloseLog (periodLabel,status,result) VALUES (${key},'closed','Cierre definitivo guardado como revisión; caché original conservada')`;
        return { ...existing, ...replacement };
      }
      if (!coverage[0] || key < coverage[0].firstCompleteMonth) throw new MissingHistoricalSnapshot('La cobertura del registro permanente no incluye este mes completo.');
      const row = await tx.metricasmensuales.create({ data: await buildMonthlyData(tx, year, month) });
      await tx.$executeRaw`INSERT INTO monthlyCloseLog (periodLabel, status, result) VALUES (${key}, 'closed', 'Snapshot y registro financiero confirmados en una transacción')`;
      return row;
    });
  } catch (error) {
    await prisma.$executeRaw`INSERT INTO monthlyCloseLog (periodLabel, status, result) VALUES (${key}, 'failed', ${error instanceof MissingHistoricalSnapshot ? error.message : 'Error de cierre; se reintentará automáticamente'})`;
    throw error;
  }
}

export async function ensureYearSnapshots(year: number) {
  const rows = await prisma.metricasmensuales.findMany({ where: { year, periodLabel: { lt: todayYMDBogota().slice(0, 7) } }, orderBy: { month: 'asc' } });
  return Promise.all(rows.map(row => ensureMonthlySnapshot(row.year, row.month)));
}

export async function refreshAutomaticSnapshots() {
  const coverage = await prisma.$queryRaw<{ firstCompleteMonth: string }[]>`SELECT firstCompleteMonth FROM financialCoverage WHERE id = 1`;
  if (!coverage[0]) throw Error('Falta la cobertura financiera; revisar migración.');
  const current = todayYMDBogota().slice(0, 7);
  let key = coverage[0].firstCompleteMonth;
  while (key < current) {
    const [year, month] = key.split('-').map(Number);
    await generateMonthlySnapshot(year, month);
    key = month === 12 ? periodKey(year + 1, 1) : periodKey(year, month + 1);
  }
}

export function serializeMonthlySnapshot(row: Awaited<ReturnType<typeof ensureMonthlySnapshot>>) {
  const p = (row.payload ?? {}) as Record<string, unknown>;
  return {
    id: row.id, year: row.year, month: row.month, periodLabel: row.periodLabel,
    source: row.id === 0 ? 'live' : 'snapshot', provenance: p.generatedBy ?? 'legacy-unverified',
    total_general: money(row.totalGeneral), total_pantallas: money(row.totalPantallas), total_cuentas: money(row.totalCuentas),
    costos: p.costos ?? null, ganancia_neta: p.ganancia_neta ?? null,
    ventas_cantidad: row.ventasCantidad, pantallas_vendidas: row.pantallasVendidas, cuentas_vendidas: row.cuentasVendidas,
    total_vendido_unidades: row.ventasCantidad, clientes_activos: row.clientesActivos,
    ranking: row.ranking, ventas_dias: row.ventasDias, ventas_dia_plataforma: p.ventas_dia_plataforma ?? null,
    registros: p.registros ?? null, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}
