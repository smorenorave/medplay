export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UsuarioCreate = z.object({
  contacto: z.string().min(5),   // p.ej. "+57 3.."
  nombre: z.string().min(1),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;

  const data = await prisma.usuarios.findMany({
    where: q
      ? {
          OR: [
            { contacto: { contains: q } },
            { nombre: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { contacto: "asc" },
    take: 200,
  });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = UsuarioCreate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const u = parsed.data;

  try {
    const created = await prisma.usuarios.create({
      data: {
        contacto: u.contacto,
        nombre: u.nombre,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    // Conflicto por contacto duplicado (si es UNIQUE)
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "contacto_duplicado" }, { status: 409 });
    }
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}