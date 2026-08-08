"use client";

import { useCart } from "@/components/shop/CartContext";

export default function CartBadge() {
  const { items } = useCart();

  return (
    <a
      href="/shop/cart"
      className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
    >
      cart{items.length > 0 ? ` (${items.length})` : ""}
    </a>
  );
}
