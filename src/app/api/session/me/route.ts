import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const TOKEN_COOKIE = "authToken";

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no configurado");
  return new TextEncoder().encode(s);
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE)?.value;
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });

    const { payload } = await jwtVerify(token, getSecret());
    return NextResponse.json({ ok: true, user: payload });
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
