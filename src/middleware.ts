import { NextResponse, NextRequest } from "next/server";
import { jwtVerify } from "jose";

const TOKEN_COOKIE = "authToken";
const ACTIVITY_COOKIE = "lastActivity";
const INACTIVITY_MS = 60 * 60 * 1000; // 1 hora

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no configurado");
  return new TextEncoder().encode(secret);
}

const PUBLIC_API_PATHS = new Set([
  "/api/admin/login",
  "/api/admin/logout",
  "/api/admin/password-recovery/request",
  "/api/admin/password-recovery/reset",
  "/api/session/me",
  "/api/session/ping",
]);

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/admin") ||
    (pathname.startsWith("/api/") && !PUBLIC_API_PATHS.has(pathname));
}

function unauthorized(req: NextRequest, reason: string) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ¿Está en una ruta protegida?
  const protectedPath = isProtectedPath(pathname);
  if (!protectedPath) {
    return NextResponse.next(); // no toca nada
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value || "";
  if (!token) {
    // No hay token → redirigir al login (o a la home)
    return unauthorized(req, "no-token");
  }

  // Verificar JWT
  try {
    await jwtVerify(token, getSecret());
  } catch {
    const res = unauthorized(req, "invalid-token");
    // limpiar cookies corruptas
    res.cookies.set(TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  // Chequear inactividad
  const raw = req.cookies.get(ACTIVITY_COOKIE)?.value;
  const last = raw ? Number(raw) : 0;
  const now = Date.now();
  const inactive = !last || now - last > INACTIVITY_MS;

  if (inactive) {
    const res = unauthorized(req, "inactive");
    res.cookies.set(TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  // Si todo ok, AVANZA y refresca lastActivity para navegación del lado del servidor
  const res = NextResponse.next();
  res.cookies.set(ACTIVITY_COOKIE, String(now), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
