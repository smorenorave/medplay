import { NextRequest, NextResponse } from "next/server";
import { expiredSession, readSession } from "@/lib/sessionResponse";
export async function POST(req: NextRequest) {
  const session = await readSession(req);
  if (!session) return expiredSession();
  const now = Date.now();
  const res = NextResponse.json({ ok: true, ts: now }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set("lastActivity", String(now), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8,
  });
  return res;
}
