"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/components/shop/CartContext";
import { CURRENCY } from "@/lib/shop-constants";

// Update this to wherever you actually want people to DM you.
const CONTACT_HANDLE = "@saia.x6";
const CONTACT_PLATFORM = "Instagram";

export default function CartPage() {
  const { items, remove, clear, total } = useCart();
  const [buyerName, setBuyerName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId })),
          buyerName,
          email,
          contact,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setPlacedOrderId(data.order.id);
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (placedOrderId) {
    return (
      <div className="flex min-h-[40vh] flex-col items-start gap-3">
        <p className="font-display text-2xl italic">order placed</p>
        <p className="font-mono text-sm text-fog">
          reference: <span className="text-ink">#{placedOrderId}</span>
        </p>
        <p className="max-w-sm font-mono text-sm text-fog">
          a confirmation just went to your email. message {CONTACT_PLATFORM}{" "}
          {CONTACT_HANDLE} with your reference number to arrange payment and
          shipping/meetup.
        </p>
        <a
          href="/shop"
          className="mt-2 font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          ← back to shop
        </a>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <p className="font-display text-xl italic text-fog">cart is empty</p>
        <a
          href="/shop"
          className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          browse the shop
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 sm:flex-row">
      <ul className="flex-1 divide-y divide-line border-t border-line">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-4 py-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-line">
              <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm text-ink">{item.title}</p>
              <p className="font-mono text-xs text-fog">
                {CURRENCY}
                {item.price.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => remove(item.productId)}
              className="font-mono text-xs text-fog underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink"
            >
              remove
            </button>
          </li>
        ))}
        <li className="flex items-center justify-between py-4">
          <span className="font-mono text-xs text-fog">total</span>
          <span className="font-mono text-sm text-ink">
            {CURRENCY}
            {total.toLocaleString()}
          </span>
        </li>
      </ul>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 sm:w-80">
        <h2 className="font-display text-xl italic">your details</h2>
        <input
          required
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="name"
          className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email (for your order confirmation)"
          className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />
        <input
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={`contact (${CONTACT_PLATFORM} handle, phone, etc.)`}
          className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="note (optional — meetup preference, etc.)"
          rows={3}
          className="resize-none border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />
        {error && <p className="font-mono text-xs text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 self-start font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
        >
          {submitting ? "placing order…" : "place order"}
        </button>
        <p className="font-mono text-[11px] text-fog">
          this just sends me your order — no payment happens here. I'll DM
          you on {CONTACT_PLATFORM} to sort payment and handoff.
        </p>
      </form>
    </div>
  );
}
