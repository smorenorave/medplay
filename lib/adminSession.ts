import { jwtVerify } from "jose";
import { isSessionInactive } from "./sessionPolicy";

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function getAuthenticatedAdminId(request: Request): Promise<number | null> {
  const token = readCookie(request, "authToken");
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || isSessionInactive(readCookie(request, "lastActivity") ?? undefined)) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.role !== "admin") return null;
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
