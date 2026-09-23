import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addDaysYMD, monthStartYMDBogota, todayYMDBogota, utcDateFromYMD } from "@/lib/bogotaDate";

export async function GET() {
  try {
    const todayYmd = todayYMDBogota();
    const tomorrowYmd = addDaysYMD(todayYmd, 1);
    const today = utcDateFromYMD(todayYmd);
    const tomorrow = utcDateFromYMD(tomorrowYmd);
    const monthStart = utcDateFromYMD(monthStartYMDBogota());
    const inSevenDays = utcDateFromYMD(addDaysYMD(todayYmd, 7));

    const [pantallasMonth, completasMonth, pantallasToday, completasToday, activeScreens, pantallasSoon, completasSoon, pantallasExpired, completasExpired, inventory, platforms] = await Promise.all([
      prisma.pantallas.findMany({ where: { fecha_compra: { gte: monthStart } }, select: { total_pagado: true, total_ganado: true, cuentascompartidas: { select: { plataforma_id: true } } } }),
      prisma.cuentascompletas.findMany({ where: { fecha_compra: { gte: monthStart } }, select: { total_pagado_completa: true, total_ganado: true, plataforma_id: true } }),
      prisma.pantallas.aggregate({
        where: { fecha_compra: { gte: today, lt: tomorrow } },
        _count: { _all: true },
        _sum: { total_ganado: true },
      }),
      prisma.cuentascompletas.aggregate({
        where: { fecha_compra: { gte: today, lt: tomorrow } },
        _count: { _all: true },
        _sum: { total_ganado: true },
      }),
      prisma.pantallas.count({ where: { fecha_vencimiento: { gte: tomorrow } } }),
      prisma.pantallas.count({ where: { fecha_vencimiento: { gte: tomorrow, lte: inSevenDays } } }),
      prisma.cuentascompletas.count({ where: { fecha_vencimiento: { gte: tomorrow, lte: inSevenDays } } }),
      prisma.pantallas.count({ where: { fecha_vencimiento: { lte: today } } }),
      prisma.cuentascompletas.count({ where: { fecha_vencimiento: { lte: today } } }),
      prisma.inventario.groupBy({ by: ["plataforma_id"], _count: { _all: true } }),
      prisma.plataformas.findMany({ select: { id: true, nombre: true } }),
    ]);
    const names = new Map(platforms.map((p) => [p.id, p.nombre]));
    const ranking = new Map<number, number>();
    pantallasMonth.forEach((r) => { const id = r.cuentascompartidas.plataforma_id; if (id) ranking.set(id, (ranking.get(id) ?? 0) + 1); });
    completasMonth.forEach((r) => ranking.set(r.plataforma_id, (ranking.get(r.plataforma_id) ?? 0) + 1));
    const money = [...pantallasMonth.map((r) => Number(r.total_pagado ?? 0)), ...completasMonth.map((r) => Number(r.total_pagado_completa ?? 0))].reduce((a, b) => a + b, 0);
    const profit = [...pantallasMonth.map((r) => Number(r.total_ganado ?? 0)), ...completasMonth.map((r) => Number(r.total_ganado ?? 0))].reduce((a, b) => a + b, 0);
    const profitToday = Number(pantallasToday._sum.total_ganado ?? 0) + Number(completasToday._sum.total_ganado ?? 0);
    const stockRotation = inventory
      .filter((item) => item._count._all > 0)
      .map((item) => {
        const sales = ranking.get(item.plataforma_id) ?? 0;
        return {
          name: names.get(item.plataforma_id) ?? `Plataforma ${item.plataforma_id}`,
          stock: item._count._all,
          sales,
          priority: sales <= 2 ? "high" : sales <= 5 ? "medium" : "normal",
        };
      })
      .sort((a, b) => a.sales - b.sales || b.stock - a.stock);
    return NextResponse.json({
      salesToday: pantallasToday._count._all + completasToday._count._all,
      profitToday,
      salesMonth: pantallasMonth.length + completasMonth.length,
      revenueMonth: money,
      profitMonth: profit,
      activeScreens,
      expiringSoon: pantallasSoon + completasSoon,
      pendingAttention: pantallasExpired + completasExpired,
      topServices: [...ranking].map(([id, count]) => ({ name: names.get(id) ?? `Plataforma ${id}`, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      lowStock: inventory.filter((item) => item._count._all <= 2).map((item) => ({ name: names.get(item.plataforma_id) ?? `Plataforma ${item.plataforma_id}`, count: item._count._all })),
      stockRotation,
      businessDate: todayYmd,
    });
  } catch (error) {
    console.error("[dashboard] load failed", error);
    return NextResponse.json({ error: "No fue posible cargar el resumen operativo" }, { status: 500 });
  }
}
