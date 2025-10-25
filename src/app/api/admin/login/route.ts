import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const TOKEN_COOKIE = "authToken";
const ACTIVITY_COOKIE = "lastActivity";
const INACTIVITY_MS = 60 * 60 * 1000; // 1 hora

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no configurado");
  return new TextEncoder().encode(secret);
}

export async function POST(req: Request) {
  try {
    const { usuario, contrasena } = await req.json();
    const u = String(usuario ?? "").trim();
    const p = String(contrasena ?? "");

    if (!u || !p) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { usuario: u } });
    if (!admin) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const ok = await bcrypt.compare(p, admin.contrasena);
    if (!ok) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    // Crea JWT (exp opcional por seguridad extra)
    const jwt = await new SignJWT({ sub: String(admin.id), usuario: u })
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
      httpOnly: false,
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
