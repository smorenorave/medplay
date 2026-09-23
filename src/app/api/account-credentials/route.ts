export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  findCredentialByPlatformEmail,
  normalizeCredentialEmail,
} from "@/lib/accountCredentials";

const QuerySchema = z.object({
  plataforma_id: z.coerce.number().int().positive(),
  correo: z.string().trim().email().max(100),
});

export async function POST(req: NextRequest) {
  const parsed = QuerySchema.safeParse(await req.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  try {
    const credential = await prisma.$transaction((tx) =>
      findCredentialByPlatformEmail(
        tx,
        parsed.data.plataforma_id,
        normalizeCredentialEmail(parsed.data.correo),
      ),
    );

    return NextResponse.json(
      credential
        ? {
            found: true,
            contrasena: credential.contrasena,
          }
        : {
            found: false,
            contrasena: null,
          },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "credential_lookup_failed" },
      { status: 500 },
    );
  }
}
