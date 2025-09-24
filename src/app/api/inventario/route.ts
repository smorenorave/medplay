export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/* ---------- Validación ---------- */
const Body = z.object({
  plataforma_id: z.coerce.number().int().positive(),
  correo: z.string().email(),
  clave: z.string().trim().optional().nullable(),
});

const Patch = z.object({
  plataforma_id: z.coerce.number().int().positive().optional(),
  correo: z.string().email().optional(),
  clave: z.string().trim().optional().nullable(),
});

/* ---------- GET: lista con filtros ---------- */
// /api/inventario?plataforma_id=..&q=texto
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get('plataforma_id');
    const q = (searchParams.get('q') || '').trim();

    const where: any = {};
    if (pid && !Number.isNaN(Number(pid))) where.plataforma_id = Number(pid);

    if (q) {
      const qLower = q.toLowerCase();
      const OR: any[] = [
        { correo: { contains: q } },
        { clave: { contains: q } },
      ];
      if (qLower !== q) {
        OR.push({ correo: { contains: qLower } });
        OR.push({ clave: { contains: qLower } });
      }
      where.OR = OR;
    }

    const rows = await prisma.inventario.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 500,
      select: {
        id: true,
        plataforma_id: true,
        correo: true,
        clave: true,
      },
    });

    // Enviamos números nativos
    const json = rows.map((r) => ({
      id: Number((r as any).id),
      plataforma_id:
        typeof (r as any).plataforma_id === 'bigint'
          ? Number((r as any).plataforma_id)
          : r.plataforma_id,
      correo: r.correo,
      clave: r.clave,
    }));

    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    console.error('GET /api/inventario', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

/* ---------- POST: crear ---------- */
export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const b = parsed.data;

    // normalizamos correo
    const correo = b.correo.trim().toLowerCase();

    const saved = await prisma.inventario.create({
      data: {
        plataforma_id: b.plataforma_id,
        correo,
        clave: b.clave ?? null,
      },
      select: { id: true, plataforma_id: true, correo: true, clave: true },
    });

    return NextResponse.json(
      {
        id: Number((saved as any).id),
        plataforma_id: Number((saved as any).plataforma_id),
        correo: saved.correo,
        clave: saved.clave,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error('POST /api/inventario', e);
    return NextResponse.json(
      { error: e?.code === 'P2003' ? 'fk_plataforma' : 'server_error' },
      { status: 500 }
    );
  }
}
