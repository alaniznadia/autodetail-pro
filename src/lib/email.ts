import nodemailer from "nodemailer";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

// Placeholder honesto: sin SMTP_HOST configurado no hay proveedor de email
// todavía (Gmail, SendGrid, Mailgun, etc.), así que el envío se salta con un
// aviso en consola en vez de romper el flujo que lo dispara (crear un pedido
// o cambiar su estado nunca debe fallar por esto). Configurar las variables
// SMTP_* en .env cuando la tienda tenga una cuenta de envío real.
function getTransporter() {
  if (transporter !== undefined) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] SMTP no configurado — no se envió "${subject}" a ${to}`);
    return;
  }

  // Igual que sendWhatsAppMessage: una falla transitoria de red/SMTP no
  // debería perder la notificación, así que reintentamos un par de veces
  // antes de darla por perdida (y loguearla, sin romper el flujo que la
  // disparó).
  const retries = 2;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await t.sendMail({
        from: process.env.EMAIL_FROM ?? "Epic Shine <no-reply@epicshine.com.ar>",
        to,
        subject,
        html,
      });
      return;
    } catch (err) {
      if (attempt === retries) {
        console.error(`[email] Error enviando "${subject}" a ${to}`, err);
      } else {
        await sleep(1000 * 2 ** attempt);
      }
    }
  }
}
