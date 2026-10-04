import { serializable } from "./emailDeletion";
import type { Prisma } from "../src/generated/prisma";
import { prisma } from "@/lib/db";
import { addDaysYMD, todayYMDBogota, utcDateFromYMD } from "@/lib/bogotaDate";

type Sale = {
  fecha: Date | null;
  total: unknown;
  plataformaId: number | null;
  plataforma: string;
  tipo: "P" | "C";
};

const pad2 = (value: number) => String(value).padStart(2, "0");
const money = (value: unknown) => {
  const parsed = Number(value == null ? 0 : String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

function monthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function isCurrentMonth(year: number, month: number) {
  const today = todayYMDBogota();
  return Number(today.slice(0, 4)) === year && Number(today.slice(5, 7)) === month;
}

function periodIsFuture(year: number, month: number) {
  const current = todayYMDBogota().slice(0, 7);
  return `${year}-${pad2(month)}` > current;
}

export async function generateMonthlySnapshot(year: number, month: number) {
  return serializable(prisma, tx => generateSnapshot(tx, year, month));
}

async function generateSnapshot(tx: Prisma.TransactionClient, year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("invalid-period");
  }

  const { start, end } = monthBounds(year, month);
  const [screenRows, completeRows] = await Promise.all([
    tx.pantallas.findMany({
      where: { fecha_compra: { gte: start, lt: end } },
      select: {
        fecha_compra: true,
        total_ganado: true,
        cuentascompartidas: {
          select: {
            plataforma_id: true,
            plataformas: { select: { nombre: true } },
          },
        },
      },
    }),
    tx.cuentascompletas.findMany({
      where: { fecha_compra: { gte: start, lt: end } },
      select: {
        fecha_compra: true,
        total_ganado: true,
        plataforma_id: true,
        plataformas: { select: { nombre: true } },
      },
    }),
  ]);

  const sales: Sale[] = [
    ...screenRows.map((row) => ({
      fecha: row.fecha_compra,
      total: row.total_ganado,
      plataformaId: row.cuentascompartidas.plataforma_id,
      plataforma: row.cuentascompartidas.plataformas?.nombre ?? "Sin plataforma",
      tipo: "P" as const,
    })),
    ...completeRows.map((row) => ({
      fecha: row.fecha_compra,
      total: row.total_ganado,
      plataformaId: row.plataforma_id,
      plataforma: row.plataformas.nombre,
      tipo: "C" as const,
    })),
  ];

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dayRows = Array.from({ length: daysInMonth }, (_, index) => ({
    day: pad2(index + 1),
    total: 0,
    pantallas: 0,
    completas: 0,
  }));
  const ranking = new Map<string, { name: string; count: number; total: number; pid: number | null }>();
  const dailyPlatform: Array<{ day: string; pid: number | null; tipo: "C" | "P"; total: number }> = [];

  for (const sale of sales) {
    const amount = money(sale.total);
    const day = sale.fecha?.getUTCDate();
    if (day && dayRows[day - 1]) {
      dayRows[day - 1].total += amount;
      if (sale.tipo === "P") dayRows[day - 1].pantallas += amount;
      else dayRows[day - 1].completas += amount;
    }

    const key = sale.plataformaId == null ? `name:${sale.plataforma}` : `id:${sale.plataformaId}`;
    const current = ranking.get(key) ?? {
      name: sale.plataforma,
      count: 0,
      total: 0,
      pid: sale.plataformaId,
    };
    current.count += 1;
    current.total += amount;
    ranking.set(key, current);

    dailyPlatform.push({
      day: pad2(day ?? 1),
      pid: sale.plataformaId,
      tipo: sale.tipo,
      total: amount,
    });
  }

  const totalPantallas = screenRows.reduce((sum, row) => sum + money(row.total_ganado), 0);
  const totalCuentas = completeRows.reduce((sum, row) => sum + money(row.total_ganado), 0);
  const activeThreshold = isCurrentMonth(year, month)
    ? utcDateFromYMD(addDaysYMD(todayYMDBogota(), 1))
    : end;
  const [activeScreens, activeCompletes] = await Promise.all([
    tx.pantallas.count({
      where: { fecha_compra: { lt: activeThreshold }, fecha_vencimiento: { gte: activeThreshold } },
    }),
    tx.cuentascompletas.count({
      where: { fecha_compra: { lt: activeThreshold }, fecha_vencimiento: { gte: activeThreshold } },
    }),
  ]);

  const payload = {
    generatedBy: "server",
    pantallas_vendidas: screenRows.length,
    cuentas_vendidas: completeRows.length,
    ventas_dia_plataforma: dailyPlatform,
  };

  return tx.metricasmensuales.upsert({
    where: { year_month: { year, month } },
    create: {
      year,
      month,
      periodLabel: `${year}-${pad2(month)}`,
      totalGeneral: (totalPantallas + totalCuentas).toFixed(2),
      totalPantallas: totalPantallas.toFixed(2),
      totalCuentas: totalCuentas.toFixed(2),
      ventasCantidad: sales.length,
      pantallasVendidas: screenRows.length,
      cuentasVendidas: completeRows.length,
      clientesActivos: activeScreens + activeCompletes,
      ranking: [...ranking.values()].sort((a, b) => b.count - a.count || b.total - a.total),
      ventasDias: dayRows,
      payload,
    },
    update: {
      periodLabel: `${year}-${pad2(month)}`,
      totalGeneral: (totalPantallas + totalCuentas).toFixed(2),
      totalPantallas: totalPantallas.toFixed(2),
      totalCuentas: totalCuentas.toFixed(2),
      ventasCantidad: sales.length,
      pantallasVendidas: screenRows.length,
      cuentasVendidas: completeRows.length,
      clientesActivos: activeScreens + activeCompletes,
      ranking: [...ranking.values()].sort((a, b) => b.count - a.count || b.total - a.total),
      ventasDias: dayRows,
      payload,
    },
  });
}

export async function ensureMonthlySnapshot(year: number, month: number) {
  if (periodIsFuture(year, month)) return generateMonthlySnapshot(year, month);
  const existing = await prisma.metricasmensuales.findUnique({
    where: { year_month: { year, month } },
  });
  const needsCountBackfill = Boolean(
    existing &&
    existing.ventasCantidad > 0 &&
    existing.pantallasVendidas + existing.cuentasVendidas === 0,
  );
  if (!existing || isCurrentMonth(year, month) || needsCountBackfill) {
    return generateMonthlySnapshot(year, month);
  }
  return existing;
}

export async function ensureYearSnapshots(year: number) {
  const today = todayYMDBogota();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  if (year > currentYear) return [];
  const lastMonth = year === currentYear ? currentMonth : 12;
  return Promise.all(Array.from({ length: lastMonth }, (_, index) => ensureMonthlySnapshot(year, index + 1)));
}

export async function refreshAutomaticSnapshots() {
  const today = todayYMDBogota();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  await generateMonthlySnapshot(year, month);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  if (Number(today.slice(8, 10)) === 1) {
    await generateMonthlySnapshot(previous.year, previous.month);
  } else {
    await ensureMonthlySnapshot(previous.year, previous.month);
  }
}

export function serializeMonthlySnapshot(row: Awaited<ReturnType<typeof generateMonthlySnapshot>>) {
  const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
    ? row.payload as Record<string, unknown>
    : {};
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    periodLabel: row.periodLabel,
    total_general: money(row.totalGeneral),
    total_pantallas: money(row.totalPantallas),
    total_cuentas: money(row.totalCuentas),
    ventas_cantidad: row.ventasCantidad,
    pantallas_vendidas: row.pantallasVendidas,
    cuentas_vendidas: row.cuentasVendidas,
    total_vendido_unidades: row.pantallasVendidas + row.cuentasVendidas,
    clientes_activos: row.clientesActivos,
    ranking: row.ranking,
    ventas_dias: row.ventasDias,
    ventas_dia_plataforma: payload.ventas_dia_plataforma ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
