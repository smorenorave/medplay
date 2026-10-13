import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";
import { deleteEmails } from "@/lib/emailDeletion";
import { globalDeletionFailure } from "@/lib/globalDeletionFailure";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ correos: z.array(z.string().trim().email().max(191)).min(1).max(100), motivo: z.string().trim().max(2000).optional() }).strict();
export async function DELETE(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Indica entre 1 y 100 correos válidos y un motivo de hasta 2000 caracteres." }, { status: 400 });
  try {
    const result = await deleteEmails(prisma, { ...body.data, adminId });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return globalDeletionFailure(error);
  }
}
