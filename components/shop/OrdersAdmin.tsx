"use client";

import { useMemo, useState } from "react";
import type { Order, OrderStatus } from "@/lib/orders";
import { CURRENCY } from "@/lib/shop-constants";

const STATUSES: OrderStatus[] = ["new", "confirmed", "fulfilled", "cancelled"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdersAdmin({ orders }: { orders: Order[] }) {
  const [items, setItems] = useState(orders);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<OrderStatus | "all">("all");

  const visibleItems = useMemo(
    () =>
      activeStatus === "all"
        ? items
        : items.filter((o) => o.status === activeStatus),
    [items, activeStatus],
  );

  async function updateStatus(id: string, status: OrderStatus) {
    setUpdating(id);
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await fetch(`/api/shop/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      alert("Couldn't update that order. Try again.");
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this order? This can't be undone.")) return;
    try {
      await fetch(`/api/shop/orders/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((o) => o.id !== id));
    } catch {
      alert("Couldn't delete that order. Try again.");
    }
  }

  if (items.length === 0) {
    return <p className="font-mono text-sm text-fog">no orders yet</p>;
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => {
          const count =
            s === "all"
              ? items.length
              : items.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={`font-mono text-xs underline-offset-4 transition ${
                activeStatus === s
                  ? "text-ink underline decoration-ink"
                  : "text-fog underline decoration-line hover:decoration-ink"
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {visibleItems.length === 0 ? (
        <p className="font-mono text-sm text-fog">no {activeStatus} orders</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {visibleItems.map((order) => (
            <li
              key={order.id}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm text-ink">
                    #{order.id}
                  </span>
                  <span className="font-mono text-xs text-fog">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm text-ink">
                  {order.buyerName} · {order.email} · {order.contact}
                </p>
                <ul className="mt-2 flex flex-col gap-0.5">
                  {order.items.map((item, i) => (
                    <li key={i} className="font-mono text-xs text-fog">
                      {item.title} — {CURRENCY}
                      {item.price.toLocaleString()}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 font-mono text-xs text-ink">
                  total: {CURRENCY}
                  {order.total.toLocaleString()}
                </p>
                {order.note && (
                  <p className="mt-2 font-mono text-xs italic text-fog">
                    "{order.note}"
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <select
                  value={order.status}
                  disabled={updating === order.id}
                  onChange={(e) =>
                    updateStatus(order.id, e.target.value as OrderStatus)
                  }
                  className="border border-line bg-transparent px-2 py-1 font-mono text-xs text-ink outline-none focus:border-ink"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-paper text-ink">
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleDelete(order.id)}
                  className="font-mono text-xs text-fog underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink"
                >
                  delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
