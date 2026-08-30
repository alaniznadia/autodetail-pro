/**
 * Normaliza un teléfono argentino cargado como texto libre (checkout,
 * registro) al formato E.164 que espera la API de WhatsApp de Twilio,
 * incluyendo el "9" que marca los números móviles en Argentina: sin él,
 * Twilio no entrega el mensaje a un +54 aunque el resto del número esté
 * bien, y como todo destinatario de WhatsApp tiene que tener un celular,
 * siempre lo agregamos.
 *
 * No intenta corregir el viejo prefijo local "15" (ambiguo: el código de
 * área puede tener 2 a 4 dígitos, así que no hay forma confiable de saber
 * dónde termina y empieza el abonado). Un número cargado con "15" da
 * inválido acá; el placeholder del checkout pide cargarlo sin "0" ni "15".
 *
 * Devuelve los dígitos en E.164 sin el "+" (formato que espera la API de
 * Twilio), o null si no matchea un celular argentino de 10 dígitos.
 */
export function toWhatsAppE164AR(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length !== 10) return null;

  return `549${digits}`;
}
