"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/store/cart-context";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { MobileCheckoutSteps } from "@/components/store/mobile-store-ui";
import { LoyaltyRedeemField } from "@/components/store/loyalty-ui";

export function CheckoutForm({
  loyaltyEnabled,
  loyaltyBalance,
  loyaltyPointValue,
  loyaltyMinRedeem,
  isLoggedIn,
}: {
  loyaltyEnabled: boolean;
  loyaltyBalance: number;
  loyaltyPointValue: number;
  loyaltyMinRedeem: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();

  const [fulfillmentMethod, setFulfillmentMethod] = useState<"STORE_PICKUP" | "SHIPPING">(
    "STORE_PICKUP"
  );
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "MERCADO_PAGO">(
    "MERCADO_PAGO"
  );
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failedOrderId, setFailedOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Se genera una sola vez por visita al checkout: si el usuario reintenta
  // (doble clic, o el fetch falló pero el pedido ya se había creado en el
  // servidor), el backend detecta la misma clave y devuelve el pedido
  // existente en vez de duplicar la compra.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    null
  );
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const netSubtotalAfterCoupon = subtotal - (appliedCoupon?.discount ?? 0);
  const maxRedeemablePoints =
    loyaltyPointValue > 0 ? Math.floor(netSubtotalAfterCoupon / loyaltyPointValue) : 0;
  const pointsDiscount = pointsToRedeem * loyaltyPointValue;

  // El envío no se cobra acá: se coordina por WhatsApp después de pagar
  // (dirección y costo aparte), así que el total es solo lo que cobra
  // Mercado Pago por los productos.
  const total = subtotal - (appliedCoupon?.discount ?? 0) - pointsDiscount;

  // La entrega ya no tiene datos que completar (la dirección se coordina
  // por WhatsApp), así que ese paso queda "hecho" apenas se elige un
  // método; el indicador salta directo de "Datos" a "Pago".
  const datosComplete = Boolean(guestName.trim() && guestEmail.trim() && guestPhone.trim());
  const checkoutStep: 1 | 3 = !datosComplete ? 1 : 3;

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    setApplyingCoupon(true);
    setCouponError(null);

    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode, subtotal }),
    });
    const data = await res.json();

    setApplyingCoupon(false);

    if (!res.ok) {
      setCouponError(typeof data.error === "string" ? data.error : "Cupón inválido.");
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon({ code: couponCode.toUpperCase(), discount: Number(data.discountTotal) });
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">No tenés productos en el carrito</h1>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded border border-accent px-6 py-3 font-display text-sm hover:bg-accent hover:text-background"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // La clave de idempotencia no cambia entre reintentos (ni los
    // automáticos de fetchWithRetry ni uno manual del usuario después de
    // un error): si el pedido ya se había creado en un intento anterior
    // que falló solo al volver la respuesta, esto devuelve ese mismo
    // pedido en vez de duplicar la compra.
    let res: Response;
    try {
      res = await fetchWithRetry("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentMethod,
          paymentMethod,
          guestName,
          guestEmail,
          guestPhone,
          couponCode: appliedCoupon?.code,
          pointsToRedeem: isLoggedIn && pointsToRedeem > 0 ? pointsToRedeem : undefined,
          idempotencyKey,
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      });
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo."
      );
      return;
    }

    if (!res.ok) {
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear el pedido.");
      return;
    }

    const { order } = await res.json();
    clear();

    if (paymentMethod !== "MERCADO_PAGO") {
      setSubmitting(false);
      router.push(`/pedido/${order.id}`);
      return;
    }

    let mpRes: Response;
    try {
      mpRes = await fetchWithRetry("/api/checkout/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
    } catch {
      setSubmitting(false);
      setError(
        `No se pudo conectar con Mercado Pago. Tu pedido #${order.orderNumber} quedó registrado; podés reintentar el pago.`
      );
      setFailedOrderId(order.id);
      return;
    }

    if (!mpRes.ok) {
      setSubmitting(false);
      const data = await mpRes.json().catch(() => ({}));
      setError(
        typeof data.error === "string"
          ? `${data.error} Tu pedido #${order.orderNumber} quedó registrado.`
          : "No se pudo iniciar el pago con Mercado Pago. Tu pedido quedó registrado."
      );
      setFailedOrderId(order.id);
      return;
    }

    const { initPoint } = await mpRes.json();
    window.location.href = initPoint;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold">Finalizar compra</h1>

      <MobileCheckoutSteps step={checkoutStep} />

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-8">
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="font-display text-lg">Tus datos</legend>
          <div>
            <label htmlFor="guestName" className="block text-sm">
              Nombre y apellido
            </label>
            <input
              id="guestName"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="guestEmail" className="block text-sm">
              Email
            </label>
            <input
              id="guestEmail"
              type="email"
              required
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="guestPhone" className="block text-sm">
              Teléfono
            </label>
            <input
              id="guestPhone"
              type="tel"
              required
              placeholder="11 2345-6789 (sin 0 ni 15)"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display text-lg">Entrega</legend>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-2 rounded border border-border p-3">
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillmentMethod === "STORE_PICKUP"}
                onChange={() => setFulfillmentMethod("STORE_PICKUP")}
              />
              Retiro en el local (sin cargo)
            </label>
            <label className="flex items-center gap-2 rounded border border-border p-3">
              <input
                type="radio"
                name="fulfillment"
                checked={fulfillmentMethod === "SHIPPING"}
                onChange={() => setFulfillmentMethod("SHIPPING")}
              />
              Envío a domicilio
            </label>
          </div>

          {fulfillmentMethod === "SHIPPING" && (
            <p className="mt-3 text-xs text-foreground/60">
              Coordinamos la dirección y el costo de envío por WhatsApp una vez que
              confirmes el pago (el envío se cobra aparte, por transferencia o efectivo).
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend className="font-display text-lg">Pago</legend>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-2 rounded border border-border p-3">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "MERCADO_PAGO"}
                onChange={() => setPaymentMethod("MERCADO_PAGO")}
              />
              Mercado Pago
            </label>
            <label className="flex items-center gap-2 rounded border border-border p-3">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "CASH"}
                onChange={() => setPaymentMethod("CASH")}
              />
              Efectivo
            </label>
            <label className="flex items-center gap-2 rounded border border-border p-3">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "TRANSFER"}
                onChange={() => setPaymentMethod("TRANSFER")}
              />
              Transferencia
            </label>
          </div>
          {paymentMethod !== "MERCADO_PAGO" && (
            <p className="mt-2 text-xs text-foreground/60">
              Coordinamos el pago por WhatsApp o lo abonás al retirar/recibir.
            </p>
          )}
        </fieldset>

        <div>
          <label htmlFor="coupon" className="block font-display text-sm">
            Cupón de descuento
          </label>
          <div className="mt-1 flex max-w-sm gap-2">
            <input
              id="coupon"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value);
                setAppliedCoupon(null);
                setCouponError(null);
              }}
              placeholder="CÓDIGO"
              className="w-full rounded border border-border bg-background px-3 py-2 uppercase"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={!couponCode || applyingCoupon}
              className="shrink-0 rounded border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
            >
              {applyingCoupon ? "Validando..." : "Aplicar"}
            </button>
          </div>
          {couponError && <p className="mt-1 text-sm text-red-400">{couponError}</p>}
          {appliedCoupon && (
            <p className="mt-1 text-sm text-green-500">
              Cupón {appliedCoupon.code} aplicado: -${appliedCoupon.discount.toFixed(2)}
            </p>
          )}
        </div>

        {loyaltyEnabled && isLoggedIn && (
          <fieldset>
            <legend className="font-display text-sm">Puntos Epic Shine</legend>
            <div className="mt-2">
              <LoyaltyRedeemField
                balance={loyaltyBalance}
                minRedeem={loyaltyMinRedeem}
                pointValue={loyaltyPointValue}
                maxRedeemable={maxRedeemablePoints}
                onChange={setPointsToRedeem}
              />
            </div>
          </fieldset>
        )}

        <div className="rounded border border-border p-4">
          <p className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </p>
          <p className="flex justify-between text-sm">
            <span>Envío</span>
            <span>{fulfillmentMethod === "SHIPPING" ? "A coordinar por WhatsApp" : "Sin cargo"}</span>
          </p>
          {appliedCoupon && (
            <p className="flex justify-between text-sm">
              <span>Descuento ({appliedCoupon.code})</span>
              <span>-${appliedCoupon.discount.toFixed(2)}</span>
            </p>
          )}
          {pointsDiscount > 0 && (
            <p className="flex justify-between text-sm">
              <span>Descuento por puntos</span>
              <span>-${pointsDiscount.toFixed(2)}</span>
            </p>
          )}
          <p className="mt-2 flex justify-between font-display text-xl">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
            {failedOrderId && (
              <>
                {" "}
                <Link href={`/pedido/${failedOrderId}`} className="underline underline-offset-4">
                  Ver mi pedido
                </Link>
              </>
            )}
          </p>
        )}

        <div className="sticky bottom-0 border-t border-border bg-background px-4 py-3 -mx-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded border border-accent px-8 py-3 font-display text-lg hover:bg-accent hover:text-background disabled:opacity-50 sm:w-fit"
          >
            {submitting ? "Confirmando..." : "Confirmar pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
