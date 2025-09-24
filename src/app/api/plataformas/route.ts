// src/app/api/plataformas/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/plataformas
 * (opcional) ?q=texto para filtrar por nombre (case-insensitive)
 * Responde: Array<{ id, nombre }>
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();

    const where = q ? { nombre: { contains: q, mode: 'insensitive' as const } } : undefined;

    const items = await prisma.plataformas.findMany({
      where,
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json(items, { status: 200 });
  } catch (err) {
    console.error('GET /api/plataformas error:', err);
    return NextResponse.json(
      { error: 'No se pudieron listar las plataformas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/plataformas
 * Body: { nombre: string }
 * Responde: { id, nombre }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = (body?.nombre ?? '').toString();
    const nombre = raw.trim();

    if (!nombre) {
      return NextResponse.json(
        { error: 'El campo "nombre" es obligatorio.' },
        { status: 400 }
      );
    }
    if (nombre.length > 100) {
      return NextResponse.json(
        { error: 'El nombre no puede exceder 100 caracteres.' },
        { status: 400 }
      );
    }

    const created = await prisma.plataformas.create({
      data: { nombre },
      select: { id: true, nombre: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      // Unique constraint (nombre)
      return NextResponse.json(
        { error: 'Ya existe una plataforma con ese nombre.' },
        { status: 409 }
      );
    }
    console.error('POST /api/plataformas error:', err);
    return NextResponse.json(
      { error: 'No se pudo crear la plataforma' },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}
