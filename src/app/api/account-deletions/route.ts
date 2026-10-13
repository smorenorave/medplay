import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";
import { deleteEmails, serializable } from "@/lib/emailDeletion";
import { deletionImpact, DeletionConfirmationError } from "@/lib/deletionImpact";
import { globalDeletionFailure } from "@/lib/globalDeletionFailure";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ correos: z.array(z.string().trim().email().max(191)).min(1).max(100), motivo: z.string().trim().max(2000).optional() }).strict();
const confirmedSchema = bodySchema.extend({ confirmation: z.string().regex(/^[a-f0-9]{64}$/), confirmado: z.literal(true) });

export async function POST(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Indica los correos que deseas verificar." }, { status: 400 });
  try {
    const result = await serializable(prisma, async tx => {
      if (!await tx.admin.findUnique({ where: { id: adminId }, select: { id: true } })) throw new Error("unauthorized");
      return deletionImpact(tx, body.data.correos);
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return globalDeletionFailure(error); }
}
export async function DELETE(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = confirmedSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Primero revisa las pantallas y clientes asociados y confirma expresamente la eliminación global." }, { status: 409 });
  try {
    const result = await deleteEmails(prisma, { ...body.data, adminId });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DeletionConfirmationError) return NextResponse.json({ error: error.message }, { status: 409 });
    return globalDeletionFailure(error);
  }
}
