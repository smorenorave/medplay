import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";
import { deleteEmails } from "@/lib/emailDeletion";

export const dynamic = "force-dynamic";
const schema = z.object({
  targets: z.array(z.object({ tipo: z.enum(["pantalla", "completa"]), id: z.string().max(20).regex(/^[1-9]\d*$/) }).strict()).min(1).max(100),
  motivo: z.string().trim().max(2000).optional(),
}).strict();

export async function DELETE(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.targets.some(row => BigInt(row.id) > (row.tipo === "completa" ? 18446744073709551615n : 2147483647n))) return NextResponse.json({ error: "Selecciona entre 1 y 100 registros válidos." }, { status: 400 });
  try {
    const result = await deleteEmails(prisma, { expiredTargets: body.data.targets, motivo: body.data.motivo, adminId });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Expired account deletion failed", error);
    return NextResponse.json({ error: "No se pudo completar la operación. No se guardó ningún cambio." }, { status: (error as Error).message === "unauthorized" ? 401 : 500 });
  }
}
