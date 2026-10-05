import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";
import { restoreDeletedRecord, RestorationError } from "@/lib/restoreDeletedRecord";

export const dynamic = "force-dynamic";
const id = z.string().regex(/^[1-9]\d{0,19}$/);
const schema = z.object({ auditId: id, evento: z.number().int().nonnegative().max(2147483647), tipo: z.enum(["pantalla", "completa"]), id }).strict();
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return response({ error: "No autorizado" }, 401);
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success || BigInt(body.data.auditId) > 18446744073709551615n || BigInt(body.data.id) > (body.data.tipo === "pantalla" ? 2147483647n : 18446744073709551615n)) return response({ error: "Selecciona un registro válido del historial." }, 400);
  try {
    return response(await restoreDeletedRecord(prisma, body.data, adminId));
  } catch (error) {
    if (error instanceof RestorationError) return response({ error: error.message }, error.status);
    console.error("Account restoration failed", error);
    return response({ error: "No se pudo restaurar. No se guardó ningún cambio." }, 500);
  }
}
