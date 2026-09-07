import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Input = z.object({ email: z.string().trim().email().max(191) });

async function adminId(req: NextRequest) {
  const token = req.cookies.get("authToken")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return null;
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  const id = Number(payload.sub);
  return Number.isInteger(id) ? id : null;
}

export async function GET(req: NextRequest) {
  try {
    const id = await adminId(req);
    if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const account = await prisma.admin.findUnique({ where: { id }, select: { email: true } });
    return NextResponse.json({ email: account?.email ?? "" });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = await adminId(req);
    if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const parsed = Input.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
    const email = parsed.data.email.toLowerCase();
    await prisma.$transaction([
      prisma.admin.update({ where: { id }, data: { email } }),
      prisma.adminSecurityEvent.create({ data: { adminId: id, eventType: "RECOVERY_EMAIL_UPDATED", success: true } }),
    ]);
    return NextResponse.json({ ok: true, email });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "Este correo ya está registrado." }, { status: 409 });
    return NextResponse.json({ error: "No fue posible guardar el correo." }, { status: 500 });
  }
}
