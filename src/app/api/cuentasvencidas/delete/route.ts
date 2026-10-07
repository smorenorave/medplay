import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";
import { AccountSafetyError, ACTIVE_ACCOUNT_WARNING, hasActiveAssignment } from "@/lib/expiredAccountSafety";
import { deleteEmails } from "@/lib/emailDeletion";

export const dynamic = "force-dynamic";
const schema = z.object({
  targets: z.array(z.object({ tipo: z.enum(["pantalla", "completa"]), id: z.string().max(20).regex(/^[1-9]\d*$/) }).strict()).min(1).max(100),
  motivo: z.string().trim().max(2000).optional(),
  expected: z.object({ correo: z.string().min(1).max(191), clave: z.string().max(191), plataformaId: z.number().int().positive(), confirmado: z.literal(true) }).strict().optional(),
  destino: z.enum(["inventario", "eliminar"]).optional(),
}).strict();

export async function DELETE(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.targets.some(row => BigInt(row.id) > (row.tipo === "completa" ? 18446744073709551615n : 2147483647n))) return NextResponse.json({ error: "Selecciona entre 1 y 100 registros válidos." }, { status: 400 });
  try {
    const result = await deleteEmails(prisma, { expiredTargets: body.data.targets, motivo: body.data.motivo, destino: body.data.destino, expected: body.data.expected, scopedExpired: true, adminId });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountSafetyError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Expired account deletion failed", error);
    return NextResponse.json({ error: "No se pudo completar la operación. No se guardó ningún cambio." }, { status: (error as Error).message === "unauthorized" ? 401 : 500 });
  }
}

export async function GET(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId || !await prisma.admin.findUnique({ where: { id: adminId }, select: { id: true } })) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const url = new URL(request.url);
  const parsed = schema.safeParse({ targets: [{ tipo: url.searchParams.get("tipo"), id: url.searchParams.get("id") }] });
  if (!parsed.success) return NextResponse.json({ error: "Registro inválido" }, { status: 400 });
  const target = parsed.data.targets[0];
  if (BigInt(target.id) > (target.tipo === "completa" ? 18446744073709551615n : 2147483647n)) return NextResponse.json({ error: "Registro inválido" }, { status: 400 });
  const result = await prisma.$transaction(async tx => {
    const screen = target.tipo === "pantalla" ? await tx.pantallas.findUnique({ where: { id: Number(target.id) }, include: { cuentascompartidas: true } }) : null;
    const account = screen?.cuentascompartidas ?? (target.tipo === "completa" ? await tx.cuentascompletas.findUnique({ where: { id: BigInt(target.id) } }) : null);
    if (!account) return null;
    const shared = await tx.cuentascompartidas.findMany({ where: { correo: account.correo, contrasena: account.contrasena, plataforma_id: account.plataforma_id } });
    const screens = await tx.pantallas.findMany({ where: { cuenta_id: { in: shared.map(row => row.id) } } });
    const complete = await tx.cuentascompletas.findMany({ where: { correo: account.correo, contrasena: account.contrasena, plataforma_id: account.plataforma_id ?? -1 } });
    const active = [...screens, ...complete].some(hasActiveAssignment);
    const isLast = target.tipo === "pantalla" ? screens.length === 1 && complete.length === 0 : complete.length === 1 && screens.length === 0;
    return { isLast, remaining: screens.length + complete.length, active, warning: active ? ACTIVE_ACCOUNT_WARNING : null, correo: account.correo, clave: account.contrasena, plataformaId: account.plataforma_id };
  }, { isolationLevel: "Serializable" });
  return result ? NextResponse.json(result, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: "El registro ya no existe" }, { status: 404 });
}
