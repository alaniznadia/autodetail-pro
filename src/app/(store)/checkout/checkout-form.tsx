"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/store/cart-context";
import { fetchWithRetry } from "@/lib/fetch-retry";
import { MobileCheckoutSteps } from "@/components/store/mobile-store-ui";
import { LoyaltyRedeemField } from "@/components/store/loyalty-ui";

type InitialAddress = {
  street: string;
  number: string;
  floorApt: string;
  city: string;
  province: string;
  postalCode: string;
};

export function CheckoutForm({
  loyaltyEnabled,
  loyaltyBalance,
  loyaltyPointValue,
  loyaltyMinRedeem,
  isLoggedIn,
  initialAddress,
}: {
  loyaltyEnabled: boolean;
  loyaltyBalance: number;
  loyaltyPointValue: number;
  loyaltyMinRedeem: number;
  isLoggedIn: boolean;
  initialAddress?: InitialAddress;
}) {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();

  const [fulfillmentMethod, setFulfillmentMethod] = useState<"STORE_PICKUP" | "SHIPPING">(
    "STORE_PICKUP"
  );
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "MERCADO_PAGO">(
    "MERCADO_PAGO"
  );
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [address, setAddress] = useState(
    initialAddress ?? {
      street: "",
      number: "",
      floorApt: "",
      city: "",
      province: "",
      postalCode: "",
    }
  );
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

  const total =
    subtotal +
    (fulfillmentMethod === "SHIPPING" ? shippingCost : 0) -
    (appliedCoupon?.discount ?? 0) -
    pointsDiscount;

  const datosComplete = Boolean(guestName.trim() && guestEmail.trim() && guestPhone.trim());
  const entregaComplete =
    fulfillmentMethod === "STORE_PICKUP" ||
    Boolean(address.street && address.number && address.city && address.province && address.postalCode);
  const checkoutStep: 1 | 2 | 3 = !datosComplete ? 1 : !entregaComplete ? 2 : 3;

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

  useEffect(() => {
    // Fuera de "envío" el costo cotizado no se muestra ni se usa (ver el
    // cálculo de `total` más arriba), así que no hace falta resetearlo acá.
    if (fulfillmentMethod !== "SHIPPING" || items.length === 0) {
      return;
    }

    let cancelled = false;
    // Arranca el indicador de "cotizando" antes del fetch que dispara este
    // mismo efecto al cambiar de método de entrega o de carrito.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuoting(true);
    setShippingError(null);

    fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setShippingError(
            typeof data.error === "string" ? data.error : "No se pudo cotizar el envío."
          );
          setShippingCost(0);
          return;
        }
        setShippingCost(Number(data.cost));
      })
      .catch(() => {
        if (!cancelled) setShippingError("No se pudo cotizar el envío.");
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fulfillmentMethod, items]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-medium">No tenés productos en el carrito</h1>
        <Link
          href="/catalogo"
          className="store-frame mt-6 inline-block border-accent px-6 py-3 text-sm text-accent hover:bg-accent/10"
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
          shippingAddress: fulfillmentMethod === "SHIPPING" ? address : undefined,
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
    <div className="mx-auto max-w-[1100px] px-4 pb-28 pt-8 sm:px-8 sm:pb-14">
      <h1 className="mb-4 text-2xl font-medium tracking-[-0.02em]">Finalizar compra</h1>

      <MobileCheckoutSteps step={checkoutStep} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="min-w-0 flex-1 flex flex-col gap-8">
          <Section title="1 · Tus datos">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nombre y apellido" htmlFor="guestName">
                <input
                  id="guestName"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="store-frame h-11 w-full border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
                />
              </Field>
              <Field label="Email" htmlFor="guestEmail">
                <input
                  id="guestEmail"
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="store-frame h-11 w-full border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
                />
              </Field>
              <Field label="Teléfono" htmlFor="guestPhone">
                <input
                  id="guestPhone"
                  type="tel"
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="store-frame h-11 w-full border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
                />
              </Field>
            </div>
          </Section>

          <Section title="2 · Entrega">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Choice
                name="fulfillment"
                checked={fulfillmentMethod === "STORE_PICKUP"}
                onChange={() => setFulfillmentMethod("STORE_PICKUP")}
                label="Retiro en el local"
                hint="Sin cargo"
              />
              <Choice
                name="fulfillment"
                checked={fulfillmentMethod === "SHIPPING"}
                onChange={() => setFulfillmentMethod("SHIPPING")}
                label="Envío a domicilio"
                hint={
                  fulfillmentMethod === "SHIPPING"
                    ? quoting
                      ? "Cotizando…"
                      : shippingCost > 0
                        ? `$${shippingCost.toFixed(2)}`
                        : undefined
                    : undefined
                }
              />
            </div>

            {fulfillmentMethod === "SHIPPING" && shippingError && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {shippingError}
              </p>
            )}

            {fulfillmentMethod === "SHIPPING" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Calle" htmlFor="street">
                    <input
                      id="street"
                      required
                      value={address.street}
                      onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                      className="store-frame h-11 w-full border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
                    />
                  </Field>
                </div>
                <Field label="Número" htmlFor="number">
                  <input
                    id="number"
                    required
                    value={address.number}
                    onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
                    className="store-frame h-11 w-full border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
                  />
                </Field>
                <Field label="Piso/depto (opcional)" htmlFor="floorApt">
                  <input
                    id="floorApt"
                    value={address.floorApt}
                    onChange={(e) => setAddress((a) => ({ ...a, floorApt: e.target.value }))}
                    className="store-frame h-11 w-full border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
                  />
                </Field>
                <Field label="Ciudad" htmlFor="city">
                  <input
                    id="city"
                    required
                    value={address.city}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    className="store-frame h-11 w-full border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
                  />
                </Field>
                <Field label="Provincia" htmlFor="province">
                  <input
                    id="province"
                    required
                    value={address.province}
                    onChange={(e) => setAddress((a) => ({ ...a, province: e.target.value }))}
                    className="store-frame h-11 w-full border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
                  />
                </Field>
                <Field label="Código postal" htmlFor="postalCode">
                  <input
                    id="postalCode"
                    required
                    value={address.postalCode}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                    className="store-frame h-11 w-full border-border bg-background px-3 text-sm outline-none focus-visible:border-accent"
                  />
                </Field>
                <p className="text-xs text-foreground/70 sm:col-span-2">
                  El costo de envío se calcula según el peso de tu compra; todavía no está
                  integrada la cotización en vivo de Correo Argentino/Andreani, así que el envío
                  lo coordinamos por WhatsApp una vez confirmado el pedido.
                </p>
              </div>
            )}
          </Section>

          <Section title="3 · Pago">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Choice
                name="payment"
                checked={paymentMethod === "MERCADO_PAGO"}
                onChange={() => setPaymentMethod("MERCADO_PAGO")}
                label="Mercado Pago"
              />
              <Choice
                name="payment"
                checked={paymentMethod === "CASH"}
                onChange={() => setPaymentMethod("CASH")}
                label="Efectivo"
              />
              <Choice
                name="payment"
                checked={paymentMethod === "TRANSFER"}
                onChange={() => setPaymentMethod("TRANSFER")}
                label="Transferencia"
              />
            </div>
            {paymentMethod !== "MERCADO_PAGO" && (
              <p className="mt-3 text-xs text-foreground/70">
                Coordinamos el pago por WhatsApp o lo abonás al retirar/recibir.
              </p>
            )}
          </Section>

          {loyaltyEnabled && isLoggedIn && (
            <Section title="Puntos Epic Shine">
              <LoyaltyRedeemField
                balance={loyaltyBalance}
                minRedeem={loyaltyMinRedeem}
                pointValue={loyaltyPointValue}
                maxRedeemable={maxRedeemablePoints}
                onChange={setPointsToRedeem}
              />
            </Section>
          )}
        </div>

        <aside className="store-frame flex w-full shrink-0 flex-col gap-4 self-start border-border p-5 lg:sticky lg:top-[88px] lg:w-[320px]">
          <p className="text-[11.5px] uppercase tracking-[0.14em] text-foreground/62">Tu pedido</p>

          <div className="flex flex-col gap-2">
            <label htmlFor="coupon" className="sr-only">
              Cupón de descuento
            </label>
            <div className="flex gap-2">
              <input
                id="coupon"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setAppliedCoupon(null);
                  setCouponError(null);
                }}
                placeholder="Cupón de descuento"
                className="store-frame h-10 flex-1 border-border bg-background px-3 text-sm uppercase outline-none focus-visible:border-accent"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={!couponCode || applyingCoupon}
                className="store-frame h-10 shrink-0 border-border px-4 text-sm hover:border-accent disabled:opacity-50"
              >
                {applyingCoupon ? "Validando…" : "Aplicar"}
              </button>
            </div>
            {couponError && <p className="text-xs text-red-400">{couponError}</p>}
            {appliedCoupon && (
              <p className="text-xs text-accent">
                Cupón {appliedCoupon.code} aplicado: -${appliedCoupon.discount.toFixed(2)}
              </p>
            )}
          </div>

          <hr className="h-px border-0 bg-[linear-gradient(to_right,transparent,var(--color-border)_12px,var(--color-border)_calc(100%-12px),transparent)]" />

          <div className="flex flex-col gap-2 text-sm">
            <SummaryRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
            <SummaryRow
              label="Envío"
              value={
                fulfillmentMethod !== "SHIPPING"
                  ? "Sin cargo"
                  : quoting
                    ? "Cotizando…"
                    : `$${shippingCost.toFixed(2)}`
              }
            />
            {appliedCoupon && (
              <SummaryRow label={`Descuento (${appliedCoupon.code})`} value={`-$${appliedCoupon.discount.toFixed(2)}`} accent />
            )}
            {pointsDiscount > 0 && (
              <SummaryRow label="Descuento por puntos" value={`-$${pointsDiscount.toFixed(2)}`} accent />
            )}
          </div>

          <hr className="h-px border-0 bg-[linear-gradient(to_right,transparent,var(--color-border)_12px,var(--color-border)_calc(100%-12px),transparent)]" />

          <div className="flex items-baseline justify-between">
            <span className="text-sm">Total</span>
            <span className="text-xl tracking-[-0.02em]">${total.toFixed(2)}</span>
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

          <button
            type="submit"
            disabled={
              submitting || (fulfillmentMethod === "SHIPPING" && (quoting || Boolean(shippingError)))
            }
            className="store-frame hidden h-[46px] border-accent text-sm text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-45 sm:block"
          >
            {submitting ? "Confirmando…" : "Confirmar pedido"}
          </button>
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 py-3 sm:hidden">
          <button
            type="submit"
            disabled={
              submitting || (fulfillmentMethod === "SHIPPING" && (quoting || Boolean(shippingError)))
            }
            className="store-frame flex h-[46px] w-full items-center justify-center border-accent text-sm text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "Confirmando…" : `Confirmar · $${total.toFixed(2)}`}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-base font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs text-foreground/78">
        {label}
      </label>
      {children}
    </div>
  );
}

function Choice({
  name,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={`store-frame flex flex-1 cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm ${
        checked ? "border-accent text-accent" : "border-border text-foreground/90 hover:bg-foreground/5"
      }`}
    >
      <span className="flex items-center gap-2">
        <input type="radio" name={name} checked={checked} onChange={onChange} className="accent-accent" />
        {label}
      </span>
      {hint ? <span className="text-xs opacity-80">{hint}</span> : null}
    </label>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-foreground/78">{label}</span>
      <span className={accent ? "text-accent" : ""}>{value}</span>
    </div>
  );
}
