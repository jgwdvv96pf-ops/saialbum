"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductWithUrls } from "@/lib/shop";
import { CURRENCY } from "@/lib/shop-constants";
import { useCart } from "@/components/shop/CartContext";

export default function ProductDetail({
  product,
}: {
  product: ProductWithUrls;
}) {
  const [active, setActive] = useState(0);
  const { items, add, remove } = useCart();
  const inCart = items.some((i) => i.productId === product.id);

  return (
    <div>
      <a
        href="/shop"
        className="mb-8 inline-block font-mono text-xs text-fog transition hover:text-ink"
      >
        ← back to shop
      </a>

      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="flex-1">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-line">
            <Image
              src={product.imageUrls[active]}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className={`object-cover ${product.sold ? "opacity-40 grayscale" : ""}`}
              priority
            />
          </div>
          {product.imageUrls.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.imageUrls.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setActive(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-sm border ${
                    i === active ? "border-ink" : "border-transparent opacity-60"
                  }`}
                >
                  <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full sm:w-72">
          <h1 className="font-display text-2xl italic">{product.title}</h1>
          <p className="mt-1 font-mono text-sm text-fog">
            {product.size ? `${product.size} · ` : ""}
            {product.condition || ""}
          </p>
          <p className="mt-4 font-mono text-lg text-ink">
            {CURRENCY}
            {product.price.toLocaleString()}
          </p>

          {product.description && (
            <p className="mt-4 whitespace-pre-wrap font-body text-sm text-ink/80">
              {product.description}
            </p>
          )}

          <div className="mt-6">
            {product.sold ? (
              <span className="font-mono text-xs text-fog">sold</span>
            ) : (
              <button
                onClick={() =>
                  inCart
                    ? remove(product.id)
                    : add({
                        productId: product.id,
                        title: product.title,
                        price: product.price,
                        imageUrl: product.imageUrls[0],
                      })
                }
                className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
              >
                {inCart ? "remove from cart" : "add to cart"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
