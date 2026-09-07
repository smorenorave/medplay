import { NextResponse } from "next/server";
import { getMailConfiguration, verifyMailer } from "@/lib/mailer";

export async function GET() {
  const config = getMailConfiguration();
  return NextResponse.json({ configured: config.configured, missing: config.missing });
}

export async function POST() {
  const config = getMailConfiguration();
  if (!config.configured) {
    return NextResponse.json({ ok: false, error: "Configuración de correo incompleta", missing: config.missing }, { status: 400 });
  }
  try {
    await verifyMailer();
    return NextResponse.json({ ok: true, message: "Conexión SMTP verificada" });
  } catch (error) {
    console.error("[mail-status] SMTP verification failed", error);
    return NextResponse.json({ ok: false, error: "No fue posible conectar con el servidor SMTP" }, { status: 502 });
  }
}
