"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { ProductWithUrls } from "@/lib/shop";
import { CURRENCY } from "@/lib/shop-constants";
import { useCart } from "@/components/shop/CartContext";

export default function ShopGrid({
  products,
  authed,
}: {
  products: ProductWithUrls[];
  authed: boolean;
}) {
  const [items, setItems] = useState(products);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { items: cartItems, add, remove } = useCart();

  const dragId = useRef<string | null>(null);

  async function toggleSold(e: React.MouseEvent, product: ProductWithUrls) {
    e.preventDefault();
    e.stopPropagation();
    const nextSold = !product.sold;
    setItems((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, sold: nextSold } : p))
    );
    try {
      await fetch("/api/shop/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, sold: nextSold }),
      });
    } catch {
      alert("Couldn't update that. Try again.");
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this listing? This can't be undone.")) return;

    setDeleting(id);
    try {
      const res = await fetch("/api/shop/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Couldn't delete that listing. Try again.");
    } finally {
      setDeleting(null);
    }
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    if (!authed) return;
    e.preventDefault();
    if (dragId.current === null || dragId.current === overId) return;
    setItems((prev) => {
      const from = prev.findIndex((p) => p.id === dragId.current);
      const to = prev.findIndex((p) => p.id === overId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handleDragEnd() {
    const id = dragId.current;
    dragId.current = null;
    if (!authed || !id) return;
    try {
      await fetch("/api/shop/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: items.map((p) => p.id) }),
      });
    } catch {
      // best-effort
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-display text-xl italic text-fog">nothing listed yet</p>
        {authed && (
          <a
            href="/shop/upload"
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
          >
            add the first item
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((product) => {
        const inCart = cartItems.some((i) => i.productId === product.id);
        return (
          <a
            key={product.id}
            href={`/shop/${product.id}`}
            draggable={authed}
            onDragStart={() => (dragId.current = product.id)}
            onDragOver={(e) => handleDragOver(e, product.id)}
            onDragEnd={handleDragEnd}
            className={`group relative block overflow-hidden rounded-sm bg-line ${
              authed ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            <div className="relative aspect-[3/4] w-full">
              <Image
                src={product.imageUrls[0]}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-cover transition duration-500 group-hover:scale-[1.03] ${
                  product.sold ? "opacity-40 grayscale" : ""
                }`}
              />
              {product.sold && (
                <span className="absolute left-2 top-2 rounded-sm bg-black/70 px-2 py-1 font-mono text-[10px] text-white">
                  sold
                </span>
              )}

              {authed && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <a
                    href={`/shop/upload?edit=${product.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] text-white backdrop-blur hover:bg-black/80"
                  >
                    edit
                  </a>
                  <span
                    role="button"
                    onClick={(e) => toggleSold(e, product)}
                    className="rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] text-white backdrop-blur hover:bg-black/80"
                  >
                    {product.sold ? "mark available" : "mark sold"}
                  </span>
                  <span
                    role="button"
                    onClick={(e) => handleDelete(e, product.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 font-mono text-xs text-white backdrop-blur hover:bg-black/80"
                    aria-label="Delete listing"
                  >
                    {deleting === product.id ? "…" : "×"}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-ink">
                  {product.title}
                </p>
                <p className="font-mono text-xs text-fog">
                  {CURRENCY}
                  {product.price.toLocaleString()}
                  {product.size ? ` · ${product.size}` : ""}
                </p>
              </div>
              {!product.sold && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (inCart) {
                      remove(product.id);
                    } else {
                      add({
                        productId: product.id,
                        title: product.title,
                        price: product.price,
                        imageUrl: product.imageUrls[0],
                      });
                    }
                  }}
                  className={`shrink-0 font-mono text-xs underline underline-offset-4 transition ${
                    inCart
                      ? "text-ink decoration-ink"
                      : "text-fog decoration-line hover:text-ink hover:decoration-ink"
                  }`}
                >
                  {inCart ? "in cart" : "add"}
                </span>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}
