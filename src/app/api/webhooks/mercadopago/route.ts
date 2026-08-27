import { NextRequest, NextResponse } from "next/server";
import {
  MercadoPagoConfig,
  Payment as MercadoPagoPayment,
  WebhookSignatureValidator,
} from "mercadopago";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapMercadoPagoStatus } from "@/lib/mercadopago";
import { RESTOCK_STATUSES, restockOrderItems } from "@/lib/stock-returns";

/**
 * Recibe las notificaciones de pago de Mercado Pago. Valida la firma
 * (cuando MERCADOPAGO_WEBHOOK_SECRET está configurado), busca el pago real
 * contra la API de Mercado Pago (nunca confiamos en el status que venga en
 * el body de la notificación) y actualiza el Payment/Order de acuerdo al
 * resultado.
 *
 * Referencia: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/webhooks
 */
export async function POST(req: NextRequest) {
  const url = req.nextUrl;
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature,
        xRequestId,
        dataId,
        secret,
        toleranceSeconds: 300,
      });
    } catch (err) {
      console.error("Firma de webhook de Mercado Pago inválida", err);
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  const type = body?.type ?? url.searchParams.get("type");
  const paymentId = body?.data?.id ?? dataId;

  if (type !== "payment" || !paymentId) {
    // Otro tipo de notificación (merchant_order, etc.): la reconocemos sin
    // procesarla.
    return NextResponse.json({ received: true });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("Webhook de Mercado Pago recibido sin MERCADOPAGO_ACCESS_TOKEN configurado");
    return NextResponse.json({ error: "Mercado Pago no configurado" }, { status: 503 });
  }

  const mpPayment = await new MercadoPagoPayment(new MercadoPagoConfig({ accessToken })).get({
    id: paymentId,
  });

  const orderId = mpPayment.external_reference;
  if (!orderId) return NextResponse.json({ received: true });

  const { paymentStatus, orderStatus } = mapMercadoPagoStatus(mpPayment.status ?? "pending");

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { orderId, method: "MERCADO_PAGO" },
    });
    if (!payment) return;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        mpPaymentId: String(mpPayment.id),
        rawWebhookData: mpPayment as unknown as Prisma.InputJsonValue,
      },
    });

    if (orderStatus) {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (order && order.status !== orderStatus) {
        await tx.order.update({ where: { id: orderId }, data: { status: orderStatus } });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: orderStatus,
            note: `Actualizado por webhook de Mercado Pago (pago ${mpPayment.status})`,
          },
        });

        if (RESTOCK_STATUSES.has(orderStatus) && !RESTOCK_STATUSES.has(order.status)) {
          await restockOrderItems(tx, orderId, order.locationId);
        }
      }
    }
  });

  return NextResponse.json({ received: true });
}
