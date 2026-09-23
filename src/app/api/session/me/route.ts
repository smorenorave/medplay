import { NextRequest, NextResponse } from "next/server";
import { expiredSession, readSession } from "@/lib/sessionResponse";
export async function GET(req: NextRequest) {
  const session = await readSession(req);
  return session ? NextResponse.json({ ok: true, ...session }, { headers: { "Cache-Control": "no-store" } }) : expiredSession();
}
