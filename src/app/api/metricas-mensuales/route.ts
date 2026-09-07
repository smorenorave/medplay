export const runtime = "nodejs";

import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { z } from "zod";
import {
  ensureMonthlySnapshot,
  ensureYearSnapshots,
  generateMonthlySnapshot,
  serializeMonthlySnapshot,
} from "@/lib/monthlySnapshots";

const Period = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const pad2 = (value: number) => String(value).padStart(2, "0");
const numberValue = (value: unknown) => Number(value == null ? 0 : String(value));

function csvCell(value: unknown) {
  const raw = String(value ?? "");
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

  if (format === "csv") {
    const csv = ["KPI,Valor", ...kpis.map(([key, value]) => `${csvCell(key)},${csvCell(value)}`)].join("\r\n");
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

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

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

/**
 * GET exacto: genera el snapshot si falta y refresca el mes actual.
 * GET ?year=2026&annual=1: devuelve la serie anual y rellena meses faltantes.
 */
export async function GET(request: NextRequest) {
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
    console.error("GET /api/metricas-mensuales", error);
    return NextResponse.json({ error: "read_failed", detail: error?.message }, { status: 500 });
  }
}

/** Conserva compatibilidad con el POST anterior, pero el servidor ya no confía en totales del cliente. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = Period.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 400 });
    }
    const row = await generateMonthlySnapshot(parsed.data.year, parsed.data.month);
    return NextResponse.json(serializeMonthlySnapshot(row), { status: 200 });
  } catch (error: any) {
    console.error("POST /api/metricas-mensuales", error);
    return NextResponse.json({ error: "save_failed", detail: error?.message }, { status: 500 });
  }
}
