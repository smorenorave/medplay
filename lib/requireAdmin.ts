import { getAuthenticatedAdminId } from "./adminSession";
import { prisma } from "./db";

export async function getVerifiedAdminId(request: Request) {
  const id = await getAuthenticatedAdminId(request);
  return id && await prisma.admin.findUnique({ where: { id }, select: { id: true } }) ? id : null;
}
