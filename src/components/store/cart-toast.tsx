"use client";

import { useEffect } from "react";
import { useCart } from "@/components/store/cart-context";

// Confirmación visual breve al agregar algo al carrito, además del
// contador del header (que no siempre está a la vista al hacer scroll).
export function CartToast() {
  const { notice, dismissNotice } = useCart();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismissNotice, 2500);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);

  if (!notice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-6"
    >
      <div className="store-frame pointer-events-auto flex items-center gap-2 border-accent bg-surface px-4 py-2.5 text-sm text-foreground shadow-lg">
        <span aria-hidden="true" className="text-accent">✓</span>
        {notice.message}
      </div>
    </div>
  );
}
