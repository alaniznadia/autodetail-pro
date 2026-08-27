import { MercadoPagoConfig, Preference } from "mercadopago";
import type { Prisma } from "@prisma/client";

type OrderForPreference = Prisma.OrderGetPayload<{
  include: { items: { include: { variant: { include: { product: true } } } } };
}>;

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Arma el cliente de Mercado Pago con el access token configurado. Lanza un
 * error explícito (que las rutas de API traducen a un 503 legible) cuando
 * todavía no se cargó ninguna credencial, en vez de fallar de forma
 * confusa más adelante.
 */
function getMercadoPagoConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado.");
  }
  return new MercadoPagoConfig({ accessToken });
}

/**
 * Crea una preferencia de Checkout Pro para un pedido ya existente
 * (creado en estado PENDING por lib/orders.ts) y devuelve la URL a la que
 * hay que redirigir al comprador.
 */
export async function createPreferenceForOrder(order: OrderForPreference) {
  const siteUrl = getSiteUrl();
  const preferenceClient = new Preference(getMercadoPagoConfig());

  return preferenceClient.create({
    body: {
      items: order.items.map((item) => ({
        id: item.variantId,
        title: `${item.variant.product.name} - ${item.variant.name}`,
        quantity: item.quantity,
        currency_id: "ARS",
        unit_price: Number(item.unitPrice),
      })),
      external_reference: order.id,
      back_urls: {
        success: `${siteUrl}/pedido/${order.id}`,
        pending: `${siteUrl}/pedido/${order.id}`,
        failure: `${siteUrl}/pedido/${order.id}`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
    },
  });
}

export type MappedMercadoPagoStatus = {
  paymentStatus: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "CANCELLED";
  orderStatus?: "PAID" | "CANCELLED" | "REFUNDED";
};

/**
 * Traduce el status de un pago de Mercado Pago a nuestros enums internos.
 * Función pura (sin llamadas a la API) para poder testearla sin
 * credenciales reales: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/response-handling/collection-status
 */
export function mapMercadoPagoStatus(mpStatus: string): MappedMercadoPagoStatus {
  switch (mpStatus) {
    case "approved":
      return { paymentStatus: "APPROVED", orderStatus: "PAID" };
    case "refunded":
    case "charged_back":
      return { paymentStatus: "REFUNDED", orderStatus: "REFUNDED" };
    case "rejected":
      return { paymentStatus: "REJECTED" };
    case "cancelled":
      return { paymentStatus: "CANCELLED", orderStatus: "CANCELLED" };
    case "pending":
    case "in_process":
    case "in_mediation":
    case "authorized":
    default:
      return { paymentStatus: "PENDING" };
  }
}
