import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { expiredDeletionFailure } from "./expiredDeletionFailure";

/** Reuse the public diagnostic allowlist; never send raw database errors. */
export function globalDeletionFailure(error: unknown) {
  const failure = expiredDeletionFailure(error);
  const code = failure.code === "EXPIRED_DELETE_FAILED" ? "GLOBAL_DELETE_FAILED" : failure.code;
  const reference = randomUUID();
  console.error("Global email deletion failed", { reference, code }, error);
  return NextResponse.json({
    error: `${failure.error} Código de diagnóstico: ${code}. Referencia: ${reference}.`,
    code,
    reference,
  }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
}
