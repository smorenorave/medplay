import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getVerifiedAdminId } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const request = new Request("http://medplay.local/admin", { headers: await headers() });
  if (!await getVerifiedAdminId(request)) redirect("/?reason=admin-required");
  return children;
}
