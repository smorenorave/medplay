import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";
import { recordDeletion } from "@/lib/recordDeletion";
import { PantallaDeletionError } from "@/lib/pantallaDeletion";

const id = z.string().regex(/^[1-9]\d*$/).max(20);
const target = z.object({ tipo: z.enum(["pantalla", "completa"]), id }).strict().refine(value => BigInt(value.id) <= (value.tipo === "pantalla" ? 2147483647n : 18446744073709551615n));
const decision = z.object({ cuentaId: id, action: z.enum(["record", "inventory", "purge"]) }).strict();
async function handle(request: Request, remove: boolean) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const schema = remove ? z.object({ target, decision }).strict() : z.object({ target }).strict();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Registro o destino inválido." }, { status: 400 });
  try {
    const result = await recordDeletion(prisma, parsed.data.target, adminId, remove ? decision.parse("decision" in parsed.data ? parsed.data.decision : undefined) : undefined);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PantallaDeletionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Record deletion failed", error);
    return NextResponse.json({ error: "No se pudo completar la operación. No se guardó ningún cambio." }, { status: 503 });
  }
}
export const POST = (request: Request) => handle(request, false);
export const DELETE = (request: Request) => handle(request, true);
