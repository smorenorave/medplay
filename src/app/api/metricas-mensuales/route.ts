export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getVerifiedAdminId } from "@/lib/requireAdmin";
export const dynamic = "force-dynamic";
import {
  ensureMonthlySnapshot,
  ensureYearSnapshots,
  MissingHistoricalSnapshot,
  serializeMonthlySnapshot,
} from "@/lib/monthlySnapshots";

const Period = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const pad2 = (value: number) => String(value).padStart(2, "0");
const numberValue = (value: unknown) => Number(value == null ? 0 : String(value));

function csvCell(value: unknown) {
  const raw = typeof value === 'string' && /^[=+@\t\r-]/.test(value) ? `'${value}` : String(value ?? "");
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

async function exportSnapshot(
  row: Awaited<ReturnType<typeof ensureMonthlySnapshot>>,
  format: "csv" | "xlsx",
) {
  const filename = `metricas-${row.year}-${pad2(row.month)}`;
  const kpis: Array<[string, string | number]> = [
    ["Periodo", row.periodLabel],
    ["Total general", numberValue(row.totalGeneral)],
    ["Total pantallas", numberValue(row.totalPantallas)],
    ["Total cuentas completas", numberValue(row.totalCuentas)],
    ["Pantallas vendidas", row.pantallasVendidas],
    ["Cuentas completas vendidas", row.cuentasVendidas],
    ["Total vendido (unidades)", row.pantallasVendidas + row.cuentasVendidas],
    ["Clientes activos", row.clientesActivos],
  ];

  const snapshot = serializeMonthlySnapshot(row);
  kpis.push(['Costos', snapshot.costos == null ? 'No disponible' : Number(snapshot.costos)], ['Ganancia neta', snapshot.ganancia_neta == null ? 'No disponible' : Number(snapshot.ganancia_neta)]);
  const records = Array.isArray(snapshot.registros) ? snapshot.registros as Array<Record<string, unknown>> : [];
  if (format === "csv") {
    const csv = ["KPI,Valor", ...kpis.map(([key, value]) => [key,value].map(csvCell).join(',')),
      '', 'Plataforma,Unidades,Total', ...(Array.isArray(row.ranking) ? row.ranking as Array<Record<string,unknown>> : []).map(r => [r.name,r.count,r.total].map(csvCell).join(',')),
      '', 'Día,Total,Pantallas,Completas', ...(Array.isArray(row.ventasDias) ? row.ventasDias as Array<Record<string,unknown>> : []).map(r => [r.day,r.total,r.pantallas,r.completas].map(csvCell).join(',')),
      '', 'Registro,Tipo,Fecha,Plataforma,Ingreso,Costo,Unidades', ...records.map(r => [r.id,r.tipo,r.fecha,r.plataforma,r.ingreso,r.costo,r.unidades].map(csvCell).join(','))].join('\r\n');
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const kpiSheet = workbook.addWorksheet("KPIs");
  kpiSheet.addRows([["KPI", "Valor"], ...kpis]);
  kpiSheet.getRow(1).font = { bold: true };

  const rankingSheet = workbook.addWorksheet("Ranking");
  rankingSheet.addRow(["Plataforma", "Unidades", "Total", "PlataformaId"]);
  rankingSheet.getRow(1).font = { bold: true };
  for (const item of Array.isArray(row.ranking) ? row.ranking as Array<Record<string, unknown>> : []) {
    rankingSheet.addRow([item.name, item.count, item.total, item.pid ?? null]);
  }

  const daySheet = workbook.addWorksheet("Ventas_dia_total");
  daySheet.addRow(["Día", "Total", "Pantallas", "Completas"]);
  daySheet.getRow(1).font = { bold: true };
  for (const item of Array.isArray(row.ventasDias) ? row.ventasDias as Array<Record<string, unknown>> : []) {
    daySheet.addRow([item.day, item.total, item.pantallas, item.completas]);
  }

  const recordSheet = workbook.addWorksheet('Registros');
  recordSheet.addRow(['Registro', 'Tipo', 'Fecha', 'Plataforma', 'Ingreso', 'Costo', 'Unidades']);
  for (const r of records) recordSheet.addRow([r.id,r.tipo,r.fecha,r.plataforma,r.ingreso,r.costo,r.unidades]);
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

/**
 * GET exacto: mes actual en vivo; meses cerrados exclusivamente persistidos.
 * GET anual: solamente cierres guardados, sin rellenar huecos.
 */
export async function GET(request: NextRequest) {
  if (!await getVerifiedAdminId(request)) return NextResponse.json({ error: 'Permisos de administrador requeridos' }, { status: 403 });
  try {
    const params = request.nextUrl.searchParams;
    const year = Number(params.get("year"));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }

    if (params.get("annual") === "1") {
      const rows = await ensureYearSnapshots(year);
      return NextResponse.json({
        year,
        months: rows
          .sort((a, b) => a.month - b.month)
          .map((row) => ({
            month: row.month,
            periodLabel: row.periodLabel,
            label: new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "America/Bogota" })
              .format(new Date(Date.UTC(year, row.month - 1, 2))),
            cuentas_completas: row.cuentasVendidas,
            pantallas: row.pantallasVendidas,
            total: row.cuentasVendidas + row.pantallasVendidas,
            ingresos: numberValue(row.totalGeneral),
            ganancia_neta: serializeMonthlySnapshot(row).ganancia_neta,
          })),
      });
    }

    const parsed = Period.safeParse({ year, month: params.get("month") });
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }

    const row = await ensureMonthlySnapshot(parsed.data.year, parsed.data.month);
    const format = params.get("format")?.toLowerCase();
    if (format === "csv" || format === "xlsx") return exportSnapshot(row, format);
    return NextResponse.json(serializeMonthlySnapshot(row));
  } catch (error: any) {
    if (error instanceof MissingHistoricalSnapshot) return NextResponse.json({ error: "history_unavailable", detail: error.message }, { status: 404 });
    console.error("GET /api/metricas-mensuales", error);
    return NextResponse.json({ error: "read_failed", detail: 'No fue posible consultar el período. Revise el registro del servidor.' }, { status: 500 });
  }
}

/** Closed history is corrected only through the audited operator procedure. */
export async function POST() {
  return NextResponse.json({ error: 'immutable_history', detail: 'Use el procedimiento de revisión auditada.' }, { status: 405 });
}
