// src/app/api/metricas-mensuales/route.ts
export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import ExcelJS from 'exceljs';

/* ================= Schema de entrada (POST) ================= */

const RankingItem = z.object({
  name: z.string(),
  count: z.number().int(),
  total: z.number(),
  pid: z.number().nullable().optional(),
});

const VentasDiaItem = z.object({
  day: z.string(),        // "01".."31"
  total: z.number(),
  pantallas: z.number(),
  completas: z.number(),
});

/** Serie opcional por día y plataforma, guardada en payload */
const VentasDiaPlataformaItem = z.object({
  day: z.string(),                     // "01".."31"
  pid: z.number().nullable(),          // null = sin plataforma
  tipo: z.enum(['C', 'P']),            // C = completas, P = pantallas
  total: z.number(),
});

const Body = z
  .object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    total_general: z.number().finite(),
    total_pantallas: z.number().finite(),
    total_cuentas: z.number().finite(),
    clientes_activos: z.number().int().min(0),
    ventas_cantidad: z.number().int().min(0),
    ranking: z.array(RankingItem),
    ventas_dias: z.array(VentasDiaItem),
    // opcional: si la envías la guardamos en payload y la exponemos en el GET
    ventas_dia_plataforma: z.array(VentasDiaPlataformaItem).optional(),
  })
  .strict();

/* ================= Helpers ================= */
const pad2 = (n: number) => String(n).padStart(2, '0');
const dec = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2); // Prisma Decimal → string segura

/* ================= GET /api/metricas-mensuales?year=&month=&format= ================= */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));
    const format = (searchParams.get('format') || '').toLowerCase(); // '', 'csv', 'xlsx'
    const includeRaw = searchParams.get('includeRaw') === '1';

    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
    }

    const row = await prisma.metricasMensuales.findUnique({
      where: { year_month: { year, month } }, // requiere @@unique([year, month], name: "year_month")
    });

    if (!row) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // `payload` puede traer campos adicionales (p.ej. ventas_dia_plataforma)
    const payload = (row as any).payload ?? {};
    const ventasDiaPlataforma = payload?.ventas_dia_plataforma ?? null;

    // ---- Descargas ----
    if (format === 'csv') {
      const kpis = [
        ['Periodo', row.periodLabel],
        ['Total general', Number(row.totalGeneral)],
        ['Total pantallas', Number(row.totalPantallas)],
        ['Total cuentas completas', Number(row.totalCuentas)],
        ['Clientes activos', row.clientesActivos],
        ['Ventas (unidades)', row.ventasCantidad],
      ];
      const csv = ['KPI,Valor', ...kpis.map(([k, v]) => `${k},${v}`)].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="metricas-${year}-${pad2(month)}.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      const wb = new ExcelJS.Workbook();

      // KPIs
      const wsKPI = wb.addWorksheet('KPIs');
      wsKPI.addRows([
        ['KPI', 'Valor'],
        ['Periodo', row.periodLabel],
        ['Total general', Number(row.totalGeneral)],
        ['Total pantallas', Number(row.totalPantallas)],
        ['Total cuentas completas', Number(row.totalCuentas)],
        ['Clientes activos', row.clientesActivos],
        ['Ventas (unidades)', row.ventasCantidad],
      ]);
      wsKPI.getRow(1).font = { bold: true };

      // Ranking
      const wsRanking = wb.addWorksheet('Ranking');
      wsRanking.addRows([['Plataforma', 'Unidades', 'Total', 'PlataformaId']]);
      wsRanking.getRow(1).font = { bold: true };
      (row.ranking as any[] | null ?? []).forEach((r) =>
        wsRanking.addRow([r.name, r.count, r.total, r.pid ?? null])
      );

      // Ventas_dia_total
      const wsDay = wb.addWorksheet('Ventas_dia_total');
      wsDay.addRows([['Dia', 'Total', 'Pantallas', 'Completas']]);
      wsDay.getRow(1).font = { bold: true };
      (row.ventasDias as any[] | null ?? []).forEach((d) =>
        wsDay.addRow([d.day, d.total, d.pantallas, d.completas])
      );

      // Ventas_dia_plataforma (si existe en payload)
      const wsPlat = wb.addWorksheet('Ventas_dia_plataforma');
      wsPlat.addRows([['Dia', 'Tipo', 'PlataformaId', 'Total']]);
      wsPlat.getRow(1).font = { bold: true };
      (ventasDiaPlataforma as any[] | null ?? []).forEach((v) =>
        wsPlat.addRow([
          v.day,
          v.tipo === 'C' ? 'Cuentas completas' : 'Pantallas',
          v.pid,
          v.total,
        ])
      );

      // (Opcional) hojas crudas si existen modelos
      if (includeRaw) {
        try {
          const pantModel = (prisma as any).pantallas || (prisma as any).Pantallas;
          if (pantModel?.findMany) {
            const pant = await pantModel.findMany();
            const wsP = wb.addWorksheet('Pantallas_raw');
            if (pant.length) {
              const headers = Object.keys(pant[0]);
              wsP.addRow(headers);
              for (const r of pant) wsP.addRow(headers.map((h) => (r as any)[h]));
            } else wsP.addRow(['(sin filas)']);
          }

          const compModel =
            (prisma as any).cuentasCompletas ||
            (prisma as any).CuentasCompletas ||
            (prisma as any).cuentascompletas;
          if (compModel?.findMany) {
            const comp = await compModel.findMany();
            const wsC = wb.addWorksheet('Completas_raw');
            if (comp.length) {
              const headers = Object.keys(comp[0]);
              wsC.addRow(headers);
              for (const r of comp) wsC.addRow(headers.map((h) => (r as any)[h]));
            } else wsC.addRow(['(sin filas)']);
          }
        } catch {
          // si no existen los modelos, lo omitimos sin romper
        }
      }

      const buf = await wb.xlsx.writeBuffer();
      return new NextResponse(buf, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="metricas-${year}-${pad2(month)}.xlsx"`,
        },
      });
    }

    // ---- JSON normal (lo que consume tu UI) ----
    return NextResponse.json({
      id: row.id,
      year: row.year,
      month: row.month,
      periodLabel: row.periodLabel,
      total_general: Number(row.totalGeneral),
      total_pantallas: Number(row.totalPantallas),
      total_cuentas: Number(row.totalCuentas),
      ventas_cantidad: row.ventasCantidad,
      clientes_activos: row.clientesActivos,
      ranking: row.ranking as unknown,        // JSON
      ventas_dias: row.ventasDias as unknown, // JSON
      ventas_dia_plataforma: ventasDiaPlataforma, // opcional
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'read_failed', detail: e?.message }, { status: 500 });
  }
}

/* ================= POST /api/metricas-mensuales ================= */

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const b = parsed.data;
    const periodLabel = `${b.year}-${pad2(b.month)}`;

    const saved = await prisma.metricasMensuales.upsert({
      where: { year_month: { year: b.year, month: b.month } },
      update: {
        periodLabel,
        totalGeneral: dec(b.total_general),
        totalPantallas: dec(b.total_pantallas),
        totalCuentas: dec(b.total_cuentas),
        ventasCantidad: b.ventas_cantidad,
        clientesActivos: b.clientes_activos,
        ranking: b.ranking,          // JSON
        ventasDias: b.ventas_dias,   // JSON
        payload: raw,                // guarda todo lo adicional: ventas_dia_plataforma, etc.
      },
      create: {
        year: b.year,
        month: b.month,
        periodLabel,
        totalGeneral: dec(b.total_general),
        totalPantallas: dec(b.total_pantallas),
        totalCuentas: dec(b.total_cuentas),
        ventasCantidad: b.ventas_cantidad,
        clientesActivos: b.clientes_activos,
        ranking: b.ranking,
        ventasDias: b.ventas_dias,
        payload: raw,
      },
    });

    return NextResponse.json(
      {
        id: saved.id,
        year: saved.year,
        month: saved.month,
        periodLabel: saved.periodLabel,
        total_general: Number(saved.totalGeneral),
        total_pantallas: Number(saved.totalPantallas),
        total_cuentas: Number(saved.totalCuentas),
        ventas_cantidad: saved.ventasCantidad,
        clientes_activos: saved.clientesActivos,
        ranking: saved.ranking,
        ventas_dias: saved.ventasDias,
        // devuélvelo también si venía en el body
        ventas_dia_plataforma: (raw as any)?.ventas_dia_plataforma ?? null,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: 'save_failed', detail: e?.message }, { status: 500 });
  }
}
