import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // updatedAt cambia ante cualquier edición, no solo cuando cambian las fechas.
    const agg = await prisma.cuentascompletas.aggregate({
      _max: {
        updatedAt: true,
      },
    } as any);

    const latest = (agg as any)?._max?.updatedAt as Date | null | undefined;

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
