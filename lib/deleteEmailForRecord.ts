import { NextResponse } from "next/server";
import { prisma } from "./db";
import { getAuthenticatedAdminId } from "./adminSession";
import { deleteEmails, type DeletionTarget } from "./emailDeletion";

/** Returns null only for an explicit record transfer; all ordinary DELETEs are global. */
export async function deleteEmailForRecord(request: Request, target: DeletionTarget) {
  if (new URL(request.url).searchParams.get("scope") === "record") return null;
  if (!/^\d+$/.test(target.id) || BigInt(target.id) < 1n || BigInt(target.id) > (target.tipo === "completa" ? 18446744073709551615n : 2147483647n)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const result = await deleteEmails(prisma, { target, adminId, motivo: `Eliminación definitiva desde ${target.tipo}` });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Global record deletion failed", error);
    return NextResponse.json({ error: "No se pudo completar la eliminación. No se guardó ningún cambio." }, { status: (error as Error).message === "unauthorized" ? 401 : 500 });
  }
}
