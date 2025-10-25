import { NextResponse } from "next/server";

const TOKEN_COOKIE = "authToken";
const ACTIVITY_COOKIE = "lastActivity";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
