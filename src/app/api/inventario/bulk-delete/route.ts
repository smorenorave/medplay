import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedAdminId } from "@/lib/adminSession";
import { archiveDeletedAccount } from "@/lib/deletionHistory";

const schema = z.object({
  ids: z.array(z.number().int().positive().max(2147483647)).min(1).max(500),
  confirmed: z.literal(true),
}).strict();

export async function DELETE(request: Request) {
  const adminId = await getAuthenticatedAdminId(request);
  if (!adminId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Selecciona entre 1 y 500 registros y confirma la eliminación." }, { status: 400 });
  const ids = [...new Set(parsed.data.ids)].sort((a, b) => a - b);
  try {
    const deleted = await prisma.$transaction(async tx => {
      const rows = await tx.inventario.findMany({
        where: { id: { in: ids } }, orderBy: { id: "asc" },
        include: { plataformas: { select: { nombre: true } } },
      });
      for (const row of rows) {
        await archiveDeletedAccount(tx, {
          plataformaId: row.plataforma_id, plataforma: row.plataformas.nombre,
          correo: row.correo, clave: row.clave, tipoRegistro: "INVENTARIO",
          tipoEliminacion: "INVENTARIO", identificadorOriginal: row.id,
          eliminadoPorAdminId: adminId,
        });
      }
      return (await tx.inventario.deleteMany({ where: { id: { in: ids } } })).count;
    }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 });
    return NextResponse.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Inventory bulk deletion failed", error);
    return NextResponse.json({ error: "No se pudo eliminar la selección. No se guardó ningún cambio." }, { status: 500 });
  }
}
