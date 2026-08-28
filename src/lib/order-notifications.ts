import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { SITE_URL } from "@/lib/site-url";

async function loadOrderForEmail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      items: { include: { variant: { include: { product: true } } } },
    },
  });
}

type OrderForEmail = NonNullable<Awaited<ReturnType<typeof loadOrderForEmail>>>;

function recipientEmail(order: OrderForEmail) {
  return order.customer?.email ?? order.guestEmail ?? null;
}

function recipientPhone(order: OrderForEmail) {
  return order.customer?.phone ?? order.guestPhone ?? null;
}

function itemsRowsHtml(order: OrderForEmail) {
  return order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:4px 0;">${item.variant.product.name} — ${item.variant.name} x${item.quantity}</td>
          <td style="padding:4px 0; text-align:right;">$${item.totalPrice.toString()}</td>
        </tr>`
    )
    .join("");
}

function itemsListText(order: OrderForEmail) {
  return order.items
    .map((item) => `• ${item.variant.product.name} — ${item.variant.name} x${item.quantity}`)
    .join("\n");
}

function emailShell(bodyHtml: string) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <p style="font-size:18px; font-weight:bold; letter-spacing: 0.05em; text-transform: uppercase;">Epic Shine</p>
      ${bodyHtml}
      <p style="margin-top:32px; font-size:12px; color:#666;">
        Este es un email automático, no hace falta que lo respondas.
      </p>
    </div>
  `;
}

// Best-effort: un error acá nunca debe interrumpir la creación del pedido ni
// el cambio de estado que lo dispara, así que ambas funciones atrapan sus
// propios errores en vez de dejarlos propagar al llamador. Email y WhatsApp
// se intentan de forma independiente: si el cliente dejó los dos datos,
// recibe la notificación por ambos canales.

export async function notifyOrderCreated(orderId: string) {
  const order = await loadOrderForEmail(orderId).catch(() => null);
  if (!order) return;

  const to = recipientEmail(order);
  if (to) {
    try {
      await sendEmail({
        to,
        subject: `Confirmamos tu pedido #${order.orderNumber} — Epic Shine`,
        html: emailShell(`
          <h1 style="font-size:20px;">¡Gracias por tu compra, ${order.customer?.name ?? order.guestName}!</h1>
          <p>Recibimos tu pedido <strong>#${order.orderNumber}</strong> por un total de <strong>$${order.total.toString()}</strong>.</p>
          <table style="width:100%; border-collapse: collapse; margin-top:16px; border-top:1px solid #ddd; padding-top:8px;">
            ${itemsRowsHtml(order)}
          </table>
          <p style="margin-top:24px;">
            <a href="${SITE_URL}/pedido/${order.id}" style="color:#111;">Ver el estado de mi pedido</a>
          </p>
        `),
      });
    } catch (err) {
      console.error("[email] Error preparando la confirmación de pedido", err);
    }
  }

  const phone = recipientPhone(order);
  if (phone) {
    await sendWhatsAppMessage({
      to: phone,
      body:
        `¡Gracias por tu compra, ${order.customer?.name ?? order.guestName}! ` +
        `Confirmamos tu pedido #${order.orderNumber} por un total de $${order.total.toString()}:\n\n` +
        `${itemsListText(order)}\n\n` +
        `Seguilo en ${SITE_URL}/pedido/${order.id}`,
    });
  }
}

export async function notifyOrderStatusChanged(orderId: string) {
  const order = await loadOrderForEmail(orderId).catch(() => null);
  if (!order) return;

  const statusLabel = ORDER_STATUS_LABEL[order.status] ?? order.status;

  const to = recipientEmail(order);
  if (to) {
    try {
      await sendEmail({
        to,
        subject: `Tu pedido #${order.orderNumber} ahora está "${statusLabel}" — Epic Shine`,
        html: emailShell(`
          <h1 style="font-size:20px;">Actualización de tu pedido #${order.orderNumber}</h1>
          <p>Nuevo estado: <strong>${statusLabel}</strong>.</p>
          <p style="margin-top:24px;">
            <a href="${SITE_URL}/pedido/${order.id}" style="color:#111;">Ver el detalle de mi pedido</a>
          </p>
        `),
      });
    } catch (err) {
      console.error("[email] Error preparando la notificación de cambio de estado", err);
    }
  }

  const phone = recipientPhone(order);
  if (phone) {
    await sendWhatsAppMessage({
      to: phone,
      body:
        `Tu pedido #${order.orderNumber} ahora está "${statusLabel}".\n\n` +
        `Ver el detalle: ${SITE_URL}/pedido/${order.id}`,
    });
  }
}
