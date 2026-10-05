import { NextResponse } from "next/server";
import { getVerifiedAdminId } from "@/lib/requireAdmin";
import { loadDashboardData } from "@/lib/dashboardData";
export async function GET(request: Request) {
  if (!await getVerifiedAdminId(request)) return NextResponse.json({ error: "Permisos de administrador requeridos" }, { status: 403 });
  try { return NextResponse.json(await loadDashboardData(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "No fue posible cargar el resumen" }, { status: 500 }); }
}
