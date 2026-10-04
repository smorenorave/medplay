import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId || !await prisma.admin.findUnique({ where: { id: adminId }, select: { id: true } })) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const since = new URL(request.url).searchParams.get("since") ?? "0";
  if (!/^\d{1,19}$/.test(since) || BigInt(since) > 9223372036854775807n) return NextResponse.json({ error: "Revisión inválida" }, { status: 400 });
  const result = await prisma.$transaction(async tx => {
    const revision = (await tx.accountDataRevision.findUnique({ where: { id: 1 } }))?.revision ?? 0n;
    const rows = await tx.emailDeletionAudit.findMany({ where: { revision: { gt: BigInt(since), lte: revision } }, select: { correo: true } });
    return { revision: String(revision), correos: [...new Set(rows.map(row => row.correo))] };
  }, { isolationLevel: "RepeatableRead" });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
