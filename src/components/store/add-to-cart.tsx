"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/store/cart-context";

type Variant = {
  id: string;
  name: string;
  price: string;
  stock: number;
};

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export function AddToCart({
  productSlug,
  productName,
  imageUrl,
  variants,
}: {
  productSlug: string;
  productName: string;
  imageUrl?: string;
  variants: Variant[];
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  const selected = variants.find((v) => v.id === variantId);
  const outOfStock = !selected || selected.stock <= 0;

  async function handleNotifyRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setNotifyStatus("submitting");
    try {
      const res = await fetch("/api/stock-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selected.id, email: notifyEmail }),
      });
      if (!res.ok) throw new Error();
      setNotifyStatus("done");
    } catch {
      setNotifyStatus("error");
    }
  }

  function handleAdd() {
    if (!selected) return;
    addItem(
      {
        variantId: selected.id,
        productSlug,
        productName,
        variantName: selected.name,
        price: selected.price,
        imageUrl,
      },
      quantity
    );
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[30px] tracking-[-0.02em]">{selected ? money(Number(selected.price)) : ""}</p>

      {variants.length > 1 ? (
        <div>
          <p className="mb-2 text-[11.5px] uppercase tracking-[0.14em] text-foreground/62">Presentación</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setVariantId(v.id);
                  setAdded(false);
                  setNotifyStatus("idle");
                  setNotifyEmail("");
                }}
                disabled={v.stock <= 0}
                className={`store-frame px-3.5 py-1.5 text-[14.5px] disabled:cursor-not-allowed disabled:opacity-40 ${
                  v.id === variantId
                    ? "border-accent text-accent"
                    : "border-border text-foreground/85 hover:bg-foreground/5"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="store-frame flex h-[46px] items-center border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Quitar uno"
            className="h-11 w-11 text-lg"
          >
            −
          </button>
          <span className="w-9 text-center text-[15px]" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(selected?.stock ?? q, q + 1))}
            aria-label="Agregar uno"
            className="h-11 w-11 text-lg"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className="store-frame h-[46px] border-accent px-7 text-sm text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Agregar al carrito
        </button>

        <span className={`text-xs ${selected && selected.stock > 0 && selected.stock <= 5 ? "text-accent" : "text-foreground/70"}`}>
          {outOfStock
            ? "Sin stock disponible"
            : selected.stock <= 5
              ? `Quedan ${selected.stock}`
              : "En stock · sale hoy"}
        </span>
      </div>

      {outOfStock && selected && (
        <div>
          {notifyStatus === "done" ? (
            <p className="text-sm text-accent">Listo, te avisamos por email cuando vuelva a haber stock.</p>
          ) : (
            <form onSubmit={handleNotifyRequest} className="flex max-w-xs flex-col gap-2 sm:flex-row">
              <label htmlFor="notify-email" className="sr-only">
                Email
              </label>
              <input
                id="notify-email"
                type="email"
                required
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={notifyStatus === "submitting"}
                className="store-frame shrink-0 border-border px-4 py-2 text-sm hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {notifyStatus === "submitting" ? "Enviando…" : "Avisame"}
              </button>
              {notifyStatus === "error" && (
                <p role="alert" className="text-xs text-red-400">
                  No se pudo guardar, probá de nuevo.
                </p>
              )}
            </form>
          )}
        </div>
      )}

      {added && (
        <p role="status" className="text-sm">
          Agregado al carrito.{" "}
          <button
            type="button"
            onClick={() => router.push("/carrito")}
            className="text-accent underline underline-offset-4"
          >
            Ver carrito
          </button>
        </p>
      )}
    </div>
  );
}
