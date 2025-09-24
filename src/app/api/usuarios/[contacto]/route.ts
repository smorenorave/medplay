export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const UsuarioUpdate = z.object({
  contacto: z.string().min(5).optional(),
  nombre: z.string().min(1).optional(), // si quieres permitir vacío/null, cambia aquí
});

function decodeContacto(raw: string) {
  return decodeURIComponent(raw);
}

async function getParams<T extends Record<string, any>>(
  ctx: { params: T } | { params: Promise<T> }
): Promise<T> {

  return typeof ctx.params?.then === 'function' ? ctx.params : Promise.resolve(ctx.params);
}

/* ================= GET ================= */
export async function GET(_req: Request, ctx: { params: { contacto: string } } | { params: Promise<{ contacto: string }> }) {
  const p = await getParams(ctx);
  const contacto = decodeContacto(p.contacto);

  const row = await prisma.usuarios.findUnique({ where: { contacto } });
  if (!row) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  return NextResponse.json(row);
}

/* ===== lógica común de update ===== */
async function applyUpdate(req: Request, ctx: { params: { contacto: string } } | { params: Promise<{ contacto: string }> }) {
  const p = await getParams(ctx);
  const contactoKey = decodeContacto(p.contacto);

  const body = await req.json().catch(() => ({}));
  const parsed = UsuarioUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const u = parsed.data;

  try {
    const updated = await prisma.usuarios.update({
      where: { contacto: contactoKey }, // contacto actual (PK/unique)
      data: {
        ...(u.contacto !== undefined ? { contacto: u.contacto } : {}),
        ...(u.nombre   !== undefined ? { nombre:   u.nombre   } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'contacto_duplicado' }, { status: 409 });
    if (e?.code === 'P2025') return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
}

/* ================= PUT/PATCH ================= */
export async function PUT(req: Request, ctx: any)   { return applyUpdate(req, ctx); }
export async function PATCH(req: Request, ctx: any) { return applyUpdate(req, ctx); }

/* ================= DELETE ================= */
export async function DELETE(_req: Request, ctx: { params: { contacto: string } } | { params: Promise<{ contacto: string }> }) {
  try {
    const p = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params;
    const contacto = decodeURIComponent(p.contacto);

    const [pantallas, cuentas] = await prisma.$transaction([
      prisma.pantallas.count({ where: { contacto } }),
      prisma.cuentascompletas.count({ where: { contacto } }),
    ]);

    if ((pantallas ?? 0) + (cuentas ?? 0) > 0) {
      return NextResponse.json(
        {
          error: 'has-relations',
          message: `No se puede eliminar: el contacto tiene ${pantallas} pantalla(s) y ${cuentas} cuenta(s) asociadas.`,
        },
        { status: 409 }
      );
    }

    await prisma.usuarios.delete({ where: { contacto } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}

/* ================= OPTIONS ================= */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Methods': 'GET,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
