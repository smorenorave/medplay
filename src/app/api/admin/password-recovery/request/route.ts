import { createHash, randomBytes, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createMailer, emailFrom } from "@/lib/mailer";

const Input = z.object({ email: z.string().trim().email().max(191) });
const GENERIC_MESSAGE = "Si el correo está registrado, recibirás instrucciones para recuperar el acceso.";
const attempts = new Map<string, number>();

function ipOf(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export async function POST(req: Request) {
  const requestId = randomUUID();
  const started = Date.now();
  const ip = ipOf(req);
  const parsed = Input.safeParse(await req.json().catch(() => null));
  const email = parsed.success ? parsed.data.email.toLowerCase() : "";
  const rateKey = `${ip}:${email}`;
  const last = attempts.get(rateKey) ?? 0;

  if (Date.now() - last < 60_000) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }
  attempts.set(rateKey, Date.now());

  let accountId: number | null = null;
  let issuedTokenId: number | null = null;
  try {
    const account = email ? await prisma.admin.findUnique({ where: { email } }) : null;
    if (account) {
      accountId = account.id;
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60_000);

      const [, issued] = await prisma.$transaction([
        prisma.adminPasswordResetToken.deleteMany({ where: { adminId: account.id, usedAt: null } }),
        prisma.adminPasswordResetToken.create({ data: { adminId: account.id, tokenHash, expiresAt, requestedIp: ip } }),
      ]);
      issuedTokenId = issued.id;

      const baseUrl = process.env.APP_URL?.replace(/\/$/, "");
      if (!baseUrl) throw new Error("APP_URL no configurado");
      const resetUrl = `${baseUrl}/restablecer-clave?token=${encodeURIComponent(rawToken)}`;
      const delivery = await createMailer().sendMail({
        from: emailFrom(),
        to: account.email!,
        subject: "Recuperación de acceso a Medplay",
        text: `Solicitaste restablecer tu clave de Medplay. Abre este enlace dentro de los próximos 30 minutos:\n\n${resetUrl}\n\nSi no realizaste esta solicitud, ignora este mensaje.`,
        html: `<p>Solicitaste restablecer tu clave de Medplay.</p><p><a href="${resetUrl}">Restablecer mi clave</a></p><p>El enlace vence en 30 minutos y solo puede utilizarse una vez.</p><p>Si no realizaste esta solicitud, ignora este mensaje.</p>`,
      });
      console.info("[password-recovery] email accepted", { requestId, adminId: account.id, messageId: delivery.messageId });
      await prisma.adminSecurityEvent.create({ data: { adminId: account.id, eventType: "PASSWORD_RESET_REQUESTED", success: true, ip, metadata: { requestId, messageId: delivery.messageId } } });
    } else {
      await prisma.adminSecurityEvent.create({ data: { eventType: "PASSWORD_RESET_UNKNOWN_EMAIL", success: false, ip } });
    }
  } catch (error) {
    console.error("[password-recovery] request failed", { requestId, accountId, error });
    if (issuedTokenId) {
      await prisma.adminPasswordResetToken.updateMany({ where: { id: issuedTokenId, usedAt: null }, data: { usedAt: new Date() } }).catch(() => undefined);
    }
    await prisma.adminSecurityEvent.create({ data: { adminId: accountId, eventType: "PASSWORD_RESET_DELIVERY_FAILED", success: false, ip, metadata: { requestId, reason: error instanceof Error ? error.message.slice(0, 500) : "unknown" } } }).catch(() => undefined);
  }

  const remaining = 350 - (Date.now() - started);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
