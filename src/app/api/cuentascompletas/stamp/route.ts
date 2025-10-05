import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Usa las fechas reales del esquema (MySQL-safe). El "as any" evita que TS se queje si tu client no tiene esas claves tipadas.
    const agg = await prisma.cuentascompletas.aggregate({
      _max: {
        fecha_vencimiento: true,
        fecha_compra: true,
      },
    } as any);

    const maxVence  = (agg as any)?._max?.fecha_vencimiento as Date | null | undefined;
    const maxCompra = (agg as any)?._max?.fecha_compra as Date | null | undefined;

    let latest: Date | null = null;
    if (maxVence && maxCompra) latest = maxVence > maxCompra ? maxVence : maxCompra;
    else latest = (maxVence ?? null) || (maxCompra ?? null);

    // Stamp en segundos desde epoch
    let stamp = latest ? Math.floor(new Date(latest).getTime() / 1000) : 0;

    // Fallback: usa MAX(id) si no hay fechas
    if (!stamp) {
      const maxIdAgg = await prisma.cuentascompletas.aggregate({ _max: { id: true } });
      const maxId = maxIdAgg._max.id as unknown as number | bigint | null;
      if (typeof maxId === 'bigint') {
        const n = Number(maxId);
        stamp = Number.isFinite(n) ? n : 0;
      } else if (typeof maxId === 'number') {
        stamp = maxId ?? 0;
      }
    }

    return NextResponse.json({ stamp }, { status: 200 });
  } catch (e: any) {
    // Devuelve 200 con stamp=0 para no romper el cliente
    return NextResponse.json(
      { stamp: 0, error: e?.message ?? 'stamp-error' },
      { status: 200 }
    );
  }
}
