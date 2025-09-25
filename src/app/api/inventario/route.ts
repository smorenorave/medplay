// app/api/inventario/route.ts
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
  plataforma_id: z.coerce.number().int().positive(),
  correo: z.string().email(),
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
      select: { id: true, plataforma_id: true, correo: true, clave: true },
    });

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

/* ---------- POST: crear / actualizar si ya existe (idempotente) ---------- */
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
    const plataforma_id = b.plataforma_id;
    const clave = (b.clave ?? null) as string | null;

    // upsert por clave compuesta (plataforma_id, correo)
    const row = await prisma.inventario.upsert({
      where: {
        // ⚠️ Ajusta el nombre si tu cliente generó otro identificador para la clave compuesta
        plataforma_id_correo: { plataforma_id, correo },
      },
      create: { plataforma_id, correo, clave },
      update: { clave },
      select: { id: true, plataforma_id: true, correo: true, clave: true },
    });

    return NextResponse.json(
      {
        id: Number((row as any).id),
        plataforma_id: Number((row as any).plataforma_id),
        correo: row.correo,
        clave: row.clave,
      },
      { status: 200 } // 200 porque puede ser create o update; si prefieres 201 solo cuando se crea, habría que detectar existencia previa
    );
  } catch (e: any) {
    console.error('POST /api/inventario failed:', e);
    // FK a plataforma inexistente
    if (e?.code === 'P2003') {
      return NextResponse.json({ error: 'fk_plataforma' }, { status: 409 });
    }
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}

/* ---------- PATCH: actualizar por (plataforma_id, correo) ---------- */
// Body requiere plataforma_id y correo para ubicar, y clave para actualizar (opcional)
export async function PATCH(req: Request) {
  try {
    const raw = await req.json();
    const parsed = Patch.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const b = parsed.data;

    const plataforma_id = b.plataforma_id;
    const correo = b.correo.trim().toLowerCase();
    const data: any = {};
    if (b.clave !== undefined) data.clave = (b.clave ?? null) as string | null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
    }

    const row = await prisma.inventario.update({
      where: {
        // ⚠️ Ajustar si el nombre difiere en tu cliente
        plataforma_id_correo: { plataforma_id, correo },
      },
      data,
      select: { id: true, plataforma_id: true, correo: true, clave: true },
    });

    return NextResponse.json(
      {
        id: Number((row as any).id),
        plataforma_id: Number((row as any).plataforma_id),
        correo: row.correo,
        clave: row.clave,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('PATCH /api/inventario failed:', e);
    if (e?.code === 'P2025') {
      // no existe esa combinación plataforma/correo
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}
