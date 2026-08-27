import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function loadOrderForEmail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true } },
      items: { include: { variant: { include: { product: true } } } },
    },
  });
}

type OrderForEmail = NonNullable<Awaited<ReturnType<typeof loadOrderForEmail>>>;

function recipientEmail(order: OrderForEmail) {
  return order.customer?.email ?? order.guestEmail ?? null;
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
// propios errores en vez de dejarlos propagar al llamador.

export async function notifyOrderCreated(orderId: string) {
  try {
    const order = await loadOrderForEmail(orderId);
    if (!order) return;
    const to = recipientEmail(order);
    if (!to) return;

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

export async function notifyOrderStatusChanged(orderId: string) {
  try {
    const order = await loadOrderForEmail(orderId);
    if (!order) return;
    const to = recipientEmail(order);
    if (!to) return;

    const statusLabel = ORDER_STATUS_LABEL[order.status] ?? order.status;

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
