"use client";

import Link from "next/link";
import { useCart } from "@/components/store/cart-context";

export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/carrito"
      aria-label={`Ver carrito de compras (${itemCount} ${itemCount === 1 ? "producto" : "productos"})`}
      className="font-display text-sm hover:text-foreground/80"
    >
      Carrito{itemCount > 0 ? ` (${itemCount})` : ""}
    </Link>
  );
}
