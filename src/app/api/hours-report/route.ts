import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      timezone,
      startedAtISO,
      stoppedAtISO,
      workedMs,

      // ✅ NUEVO (opcional)
      extraMs,
      extraLabel,
    } = body;

    if (!startedAtISO || !stoppedAtISO || typeof workedMs !== "number") {
      return Response.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
    }

    // ✅ TZ por defecto Bogotá
    const TZ = timezone || "America/Bogota";

    const start = new Date(startedAtISO);
    const stop = new Date(stoppedAtISO);

    const dateStr = new Intl.DateTimeFormat("es-CO", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(stop);

    const startStr = new Intl.DateTimeFormat("es-CO", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(start);

    const stopStr = new Intl.DateTimeFormat("es-CO", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(stop);

    const workedStr = msToHhMmSs(workedMs);

    // ✅ Sanitizar extra
    const extraMsSafe = typeof extraMs === "number" && Number.isFinite(extraMs) ? extraMs : null;
    const extraLabelSafe =
      typeof extraLabel === "string" && extraLabel.trim()
        ? extraLabel.trim()
        : "Actividad en la tienda";

    const subject = `Horas trabajadas ${dateStr}`;

    const lines: string[] = [
      `Fecha: ${dateStr} (${TZ})`,
      `Hora iniciada: ${startStr}`,
      `Hora terminada: ${stopStr}`,
      `Horas trabajadas: ${workedStr}`,
    ];

    // ✅ Agregar extra si viene
    if (extraMsSafe != null) {
      lines.push(`${extraLabelSafe}: ${msToHhMmSs(extraMsSafe)}`);
    }

    const text = lines.join("\n");

    // Config SMTP desde variables de entorno
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM, // ej: "Medplay <no-reply@tudominio.com>"
      to: "medplay93@gmail.com",
      subject,
      text,
    });

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || "Error enviando correo" },
      { status: 500 }
    );
  }
}

function msToHhMmSs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
