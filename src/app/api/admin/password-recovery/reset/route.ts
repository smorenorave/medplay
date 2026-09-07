import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Input = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128)
    .regex(/[a-z]/, "Incluye una minúscula")
    .regex(/[A-Z]/, "Incluye una mayúscula")
    .regex(/[0-9]/, "Incluye un número"),
});

function ipOf(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La solicitud o la nueva clave no cumplen los requisitos." }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const record = await prisma.adminPasswordResetToken.findUnique({ where: { tokenHash } });
  const ip = ipOf(req);
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    await prisma.adminSecurityEvent.create({ data: { adminId: record?.adminId, eventType: "PASSWORD_RESET_REJECTED", success: false, ip } });
    return NextResponse.json({ error: "El enlace no es válido o ya venció." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.adminPasswordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error("TOKEN_ALREADY_USED");
      await tx.admin.update({ where: { id: record.adminId }, data: { contrasena: passwordHash } });
      await tx.adminPasswordResetToken.updateMany({
        where: { adminId: record.adminId, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.adminSecurityEvent.create({ data: { adminId: record.adminId, eventType: "PASSWORD_RESET_COMPLETED", success: true, ip } });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "El enlace no es válido o ya fue utilizado." }, { status: 400 });
  }
}
