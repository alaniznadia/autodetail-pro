"use client";

import Link from "next/link";
import { useCart } from "@/components/store/cart-context";

export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/carrito"
      aria-label={`Ver carrito de compras (${itemCount} ${itemCount === 1 ? "producto" : "productos"})`}
      className="store-frame inline-flex items-center gap-1.5 border-accent px-3.5 py-1.5 text-[18px] text-accent hover:bg-accent/10"
    >
      Carrito{itemCount > 0 ? ` · ${itemCount}` : ""}
    </Link>
  );
}
