export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";


// GET /api/cuentascompartidas?plataforma_id=1&q=correo
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    const plataformaIdStr = searchParams.get('plataforma_id');
    const plataforma_id = plataformaIdStr ? Number(plataformaIdStr) : undefined;

    const where: any = {};
    if (plataforma_id && !Number.isNaN(plataforma_id)) where.plataforma_id = plataforma_id;
    if (q) where.correo = { contains: q }; // sin 'mode'

    const data = await prisma.cuentascompartidas.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 200,
      select: {
        id: true,
        plataforma_id: true,
        correo: true,
        contrasena: true,
        proveedor: true,
      },
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/cuentascompartidas error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST /api/cuentascompartidas
// body: { correo, contrasena?, proveedor?, plataforma_id }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });

    let { correo, contrasena, proveedor, plataforma_id } = body as {
      correo?: string;
      contrasena?: string | null;
      proveedor?: string | null;
      plataforma_id?: number | string;
    };

    const correoNorm = (correo ?? '').toString().trim().toLowerCase();
    const pid = Number(plataforma_id);

    if (!correoNorm || !pid || Number.isNaN(pid)) {
      return NextResponse.json(
        { error: 'correo y plataforma_id son obligatorios' },
        { status: 400 }
      );
    }

    // sanea a string (no null) para columnas NOT NULL
    const passStr = typeof contrasena === 'string' ? contrasena.trim() : '';
    const provStr = typeof proveedor === 'string' ? proveedor.trim() : '';

    // tomar el último si hay duplicados
    const existing = await prisma.cuentascompartidas.findFirst({
      where: { plataforma_id: pid, correo: correoNorm },
      orderBy: { id: 'desc' },
      select: { id: true, plataforma_id: true, correo: true, contrasena: true, proveedor: true },
    });

    if (existing) {
      const hasNewPass = passStr !== '';
      const hasNewProv = provStr !== '';

      if (hasNewPass || hasNewProv) {
        const updated = await prisma.cuentascompartidas.update({
          where: { id: existing.id },
          data: {
            ...(hasNewPass ? { contrasena: passStr } : {}),
            ...(hasNewProv ? { proveedor:  provStr } : {}),
          },
          select: { id: true, plataforma_id: true, correo: true, contrasena: true, proveedor: true },
        });
        return NextResponse.json(updated, { status: 200 });
      }

      return NextResponse.json(existing, { status: 200 });
    }

    // crear nuevo
    const created = await prisma.cuentascompartidas.create({
      data: {
        plataforma_id: pid,
        correo: correoNorm,
        contrasena: passStr,  // string, no null
        proveedor:  provStr,  // string, no null
      },
      select: { id: true, plataforma_id: true, correo: true, contrasena: true, proveedor: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('POST /api/cuentascompartidas error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
