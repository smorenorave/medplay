import { NextResponse } from "next/server";
import { getAuthenticatedAdminId } from "./adminSession";
import { type DeletionTarget } from "./emailDeletion";

/** Explicit record transfers keep their scope; legacy global DELETEs fail closed. */
export async function deleteEmailForRecord(request: Request, target: DeletionTarget) {
  if (new URL(request.url).searchParams.get("scope") === "record") return null;
  if (!/^\d+$/.test(target.id) || BigInt(target.id) < 1n || BigInt(target.id) > (target.tipo === "completa" ? 18446744073709551615n : 2147483647n)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ error: "Primero revisa las pantallas y clientes asociados y confirma la eliminación global desde la aplicación actualizada." }, { status: 409, headers: { "Cache-Control": "no-store" } });
}
