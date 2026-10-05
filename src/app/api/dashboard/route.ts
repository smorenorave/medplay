import { NextResponse } from "next/server";
import { loadDashboardData } from "@/lib/dashboardData";
export async function GET() {
  try {
    const { profitToday, salesMonth, revenueMonth, profitMonth, ...operational } = await loadDashboardData();
    void profitToday; void salesMonth; void revenueMonth; void profitMonth;
    return NextResponse.json(operational, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No fue posible cargar el resumen operativo" }, { status: 500 });
  }
}
