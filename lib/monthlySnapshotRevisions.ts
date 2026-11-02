import { z } from 'zod';
import { createHash } from 'node:crypto';
import { serializable } from './emailDeletion';
import { prisma } from './db';
import { todayYMDBogota } from './bogotaDate';

const amount = z.number().finite().nonnegative().multipleOf(0.01);
const count = z.number().int().nonnegative();
export const VerifiedSnapshot = z.object({
  year: z.number().int().min(2000).max(2100), month: z.number().int().min(1).max(12),
  totalGeneral: amount, totalPantallas: amount, totalCuentas: amount,
  ventasCantidad: count, pantallasVendidas: count, cuentasVendidas: count, clientesActivos: count,
  ranking: z.array(z.object({ name: z.string().min(1), pid: z.number().int().nullable(), count, total: amount })),
  ventasDias: z.array(z.object({ day: z.string().regex(/^\d{2}$/), total: amount, pantallas: amount, completas: amount })),
  payload: z.object({ costos: amount, ganancia_neta: z.number().finite(), registros: z.array(z.record(z.string(), z.json())).optional() }),
});

export async function reviseVerifiedSnapshot(input: unknown, actor: string, reason: string, evidence: string, expectedRevision: string) {
  const data = VerifiedSnapshot.parse(input);
  if (!actor.trim() || reason.trim().length < 10 || evidence.trim().length < 10) throw Error('Identifique operador, motivo y evidencia verificable.');
  const periodLabel = `${data.year}-${String(data.month).padStart(2, '0')}`;
  if (periodLabel >= todayYMDBogota().slice(0, 7)) throw Error('Solo meses terminados.');
  const cents = (n: number) => Math.round(n * 100);
  const sum = (rows: Array<{ total: number }>) => rows.reduce((n, r) => n + cents(r.total), 0);
  if (cents(data.totalGeneral) !== cents(data.totalPantallas) + cents(data.totalCuentas)
    || sum(data.ranking) !== cents(data.totalGeneral) || sum(data.ventasDias) !== cents(data.totalGeneral)
    || data.ventasDias.reduce((n, d) => n + cents(d.pantallas), 0) !== cents(data.totalPantallas)
    || data.ventasDias.reduce((n, d) => n + cents(d.completas), 0) !== cents(data.totalCuentas)
    || data.ventasDias.some(d => cents(d.total) !== cents(d.pantallas) + cents(d.completas))
    || data.ventasCantidad !== data.pantallasVendidas + data.cuentasVendidas
    || data.ranking.reduce((n, r) => n + r.count, 0) !== data.ventasCantidad
    || cents(data.payload.ganancia_neta) !== cents(data.totalGeneral) - cents(data.payload.costos)) throw Error('Totales, unidades, costos y gráficas no concuerdan.');
  const dayCount = new Date(Date.UTC(data.year, data.month, 0)).getUTCDate();
  if (data.ventasDias.length !== dayCount || data.ventasDias.some((d, i) => d.day !== String(i + 1).padStart(2, '0'))) throw Error('Se requieren todos los días del mes, en orden.');
  const replacement = { ...data, periodLabel, payload: { ...data.payload, generatedBy: 'verified-recovery', evidenceSha256: createHash('sha256').update(evidence).digest('hex') } };
  return serializable(prisma, async tx => {
    await tx.$queryRaw`SELECT id FROM financialCoverage WHERE id = 1 FOR UPDATE`;
    const previous = await tx.$queryRaw<{ id: bigint }[]>`SELECT id FROM monthlySnapshotRevision WHERE periodLabel = ${periodLabel} ORDER BY id DESC LIMIT 1`;
    if (String(previous[0]?.id ?? 0) !== expectedRevision) throw Error('La revisión cambió. Audite nuevamente antes de aplicar.');
    const existing = await tx.metricasmensuales.findUnique({ where: { year_month: { year: data.year, month: data.month } } });
    if (!existing) await tx.metricasmensuales.create({ data: replacement });
    await tx.$executeRaw`INSERT INTO monthlySnapshotRevision (periodLabel,actor,reason,evidence,replacement) VALUES (${periodLabel},${actor},${reason},${evidence},${JSON.stringify(replacement)})`;
    await tx.$executeRaw`INSERT INTO monthlyCloseLog (periodLabel,status,result) VALUES (${periodLabel},'revised',${JSON.stringify({ actor, reason, expectedRevision })})`;
    return periodLabel;
  });
}
