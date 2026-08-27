"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/store/cart-context";

const SHIPPING_FLAT_COST = 4500;

export default function CheckoutPage() {
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
  const [address, setAddress] = useState({
    street: "",
    number: "",
    floorApt: "",
    city: "",
    province: "",
    postalCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [failedOrderId, setFailedOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = subtotal + (fulfillmentMethod === "SHIPPING" ? SHIPPING_FLAT_COST : 0);

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

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fulfillmentMethod,
        paymentMethod,
        guestName,
        guestEmail,
        guestPhone,
        shippingAddress: fulfillmentMethod === "SHIPPING" ? address : undefined,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear el pedido.");
      return;
    }

    const { order } = await res.json();
    clear();

    if (paymentMethod !== "MERCADO_PAGO") {
      router.push(`/pedido/${order.id}`);
      return;
    }

    const mpRes = await fetch("/api/checkout/mercadopago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });

    if (!mpRes.ok) {
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
              Envío a domicilio (${SHIPPING_FLAT_COST})
            </label>
          </div>

          {fulfillmentMethod === "SHIPPING" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="street" className="block text-sm">
                  Calle
                </label>
                <input
                  id="street"
                  required
                  value={address.street}
                  onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="number" className="block text-sm">
                  Número
                </label>
                <input
                  id="number"
                  required
                  value={address.number}
                  onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="floorApt" className="block text-sm">
                  Piso/depto (opcional)
                </label>
                <input
                  id="floorApt"
                  value={address.floorApt}
                  onChange={(e) => setAddress((a) => ({ ...a, floorApt: e.target.value }))}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm">
                  Ciudad
                </label>
                <input
                  id="city"
                  required
                  value={address.city}
                  onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="province" className="block text-sm">
                  Provincia
                </label>
                <input
                  id="province"
                  required
                  value={address.province}
                  onChange={(e) => setAddress((a) => ({ ...a, province: e.target.value }))}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="block text-sm">
                  Código postal
                </label>
                <input
                  id="postalCode"
                  required
                  value={address.postalCode}
                  onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
                />
              </div>
              <p className="text-xs text-foreground/60 sm:col-span-2">
                El costo de envío es una tarifa fija provisoria; todavía no está integrado el
                cotizador de Correo Argentino/Andreani.
              </p>
            </div>
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

        <div className="rounded border border-border p-4">
          <p className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </p>
          <p className="flex justify-between text-sm">
            <span>Envío</span>
            <span>
              {fulfillmentMethod === "SHIPPING" ? `$${SHIPPING_FLAT_COST.toFixed(2)}` : "Sin cargo"}
            </span>
          </p>
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

        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded border border-accent px-8 py-3 font-display text-lg hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {submitting ? "Confirmando..." : "Confirmar pedido"}
        </button>
      </form>
    </div>
  );
}
