import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const TOKEN_COOKIE = "authToken";
const ACTIVITY_COOKIE = "lastActivity";

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no configurado");
  return new TextEncoder().encode(s);
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE)?.value;
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    await jwtVerify(token, getSecret()); // valida sesión

    const now = Date.now();
    const res = NextResponse.json({ ok: true, ts: now });
    res.cookies.set(ACTIVITY_COOKIE, String(now), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
