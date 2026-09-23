import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { INACTIVITY_MS, isSessionInactive } from "./sessionPolicy";
export async function readSession(req: NextRequest) {
  const token = req.cookies.get("authToken")?.value;
  const secret = process.env.AUTH_SECRET;
  const activity = req.cookies.get("lastActivity")?.value;
  if (!token || !secret || isSessionInactive(activity)) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return { user: payload, expiresAt: Math.min((payload.exp ?? 0) * 1000, Number(activity) + INACTIVITY_MS) };
  } catch { return null; }
}
export function expiredSession() {
  const response = NextResponse.json({ ok: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  for (const name of ["authToken", "lastActivity"]) response.cookies.set(name, "", { path: "/", maxAge: 0 });
  return response;
}
