import nodemailer from "nodemailer";

export type MailConfiguration = {
  configured: boolean;
  missing: string[];
  host: string | null;
  port: number;
  secure: boolean;
};

export function getMailConfiguration(): MailConfiguration {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const missing = [
    !host && "SMTP_HOST",
    !user && "SMTP_USER",
    !pass && "SMTP_PASS",
    !process.env.EMAIL_FROM && "EMAIL_FROM",
    !process.env.APP_URL && "APP_URL",
    (!Number.isInteger(port) || port <= 0) && "SMTP_PORT",
  ].filter(Boolean) as string[];
  return {
    configured: missing.length === 0,
    missing,
    host: host || null,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
  };
}

export function createMailer() {
  const config = getMailConfiguration();
  if (!config.configured) {
    throw new Error(`Correo no configurado. Faltan: ${config.missing.join(", ")}`);
  }

  return nodemailer.createTransport({
    host: config.host!,
    port: config.port,
    secure: config.secure,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10_000),
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export function emailFrom() {
  return process.env.EMAIL_FROM!;
}

export async function verifyMailer() {
  const transporter = createMailer();
  await transporter.verify();
  return true;
}
