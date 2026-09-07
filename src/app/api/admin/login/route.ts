import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const TOKEN_COOKIE = "authToken";
const ACTIVITY_COOKIE = "lastActivity";
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no configurado");
  return new TextEncoder().encode(secret);
}

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const attemptKey = forwarded || req.headers.get("x-real-ip") || "local";
    const attemptNow = Date.now();
    const current = attempts.get(attemptKey);
    if (current && current.resetAt > attemptNow && current.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta nuevamente en unos minutos." },
        { status: 429 },
      );
    }
    if (!current || current.resetAt <= attemptNow) {
      attempts.set(attemptKey, { count: 0, resetAt: attemptNow + WINDOW_MS });
    }
    const { usuario, contrasena } = await req.json();
    const u = String(usuario ?? "").trim();
    const p = String(contrasena ?? "");

    if (!u || !p) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { usuario: u } });
    const fallbackHash = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const ok = await bcrypt.compare(p, admin?.contrasena ?? fallbackHash);
    if (!ok) {
      attempts.get(attemptKey)!.count += 1;
      await prisma.adminSecurityEvent.create({
        data: { adminId: admin?.id, eventType: "LOGIN_FAILED", success: false, ip: attemptKey },
      }).catch(() => undefined);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }
    attempts.delete(attemptKey);
    await prisma.adminSecurityEvent.create({
      data: { adminId: admin!.id, eventType: "LOGIN_SUCCEEDED", success: true, ip: attemptKey },
    }).catch(() => undefined);

    // Crea JWT (exp opcional por seguridad extra)
    const jwt = await new SignJWT({ sub: String(admin!.id), usuario: u, role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("8h") // vida total del token (independiente de inactividad)
      .sign(getSecret());

    const now = Date.now();

    const res = NextResponse.json({ ok: true, mensaje: "Login exitoso" });

    // Cookie con token (HTTP-only)
    res.cookies.set(TOKEN_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8h
    });

    // Cookie de actividad (no necesita httpOnly, la renovaremos también desde el server)
    res.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
