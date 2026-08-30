import { fetchWithRetry, NetworkError } from "@/lib/fetch-retry";
import { toWhatsAppE164AR } from "@/lib/phone";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01/Accounts";

type Credentials = { accountSid: string; authToken: string; from: string };

let credentials: Credentials | null | undefined;

// Placeholder honesto, igual que lib/email.ts con SMTP: sin las variables
// TWILIO_* configuradas no hay proveedor de WhatsApp todavía, así que el
// envío se salta con un aviso en consola en vez de romper el flujo que lo
// dispara. Requiere una cuenta de Twilio con WhatsApp habilitado (sandbox
// para pruebas, número de WhatsApp Business verificado para producción).
function getCredentials(): Credentials | null {
  if (credentials !== undefined) return credentials;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !from) {
    credentials = null;
    return credentials;
  }

  credentials = { accountSid, authToken, from };
  return credentials;
}

export async function sendWhatsAppMessage({ to, body }: { to: string; body: string }) {
  const creds = getCredentials();
  if (!creds) {
    console.warn(`[whatsapp] Twilio no configurado — no se envió mensaje a ${to}`);
    return;
  }

  // El teléfono lo carga el cliente como texto libre en el checkout (no se
  // valida formato ahí). Lo normalizamos a E.164 argentino con el "9" que
  // exige WhatsApp para celulares (ver lib/phone.ts) en vez de solo pegarle
  // un "+" a los dígitos, que fallaba para cualquier número sin código de
  // país cargado. Si Twilio igual lo rechaza (número no habilitado en el
  // sandbox, etc.), queda logueado como error sin romper la creación del
  // pedido ni el cambio de estado.
  const e164 = toWhatsAppE164AR(to);
  if (!e164) {
    console.warn(`[whatsapp] Número con formato inválido, no se envió el mensaje: "${to}"`);
    return;
  }

  const from = creds.from.startsWith("whatsapp:") ? creds.from : `whatsapp:${creds.from}`;

  try {
    const res = await fetchWithRetry(
      `${TWILIO_API_BASE}/${creds.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: `whatsapp:+${e164}`, Body: body }),
      },
      { retries: 2, timeoutMs: 10000 }
    );

    if (!res.ok) {
      console.error(`[whatsapp] Error enviando mensaje (status ${res.status})`, await res.text());
    }
  } catch (err) {
    if (err instanceof NetworkError) {
      console.error("[whatsapp] No se pudo conectar con Twilio", err.cause);
    } else {
      console.error("[whatsapp] Error enviando mensaje", err);
    }
  }
}
