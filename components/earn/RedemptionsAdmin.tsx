"use client";

import { useMemo, useState } from "react";
import type { Redemption, RedemptionStatus } from "@/lib/earn/redemptions";

const STATUSES: RedemptionStatus[] = ["pending", "approved", "paid", "rejected"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RedemptionsAdmin({ redemptions }: { redemptions: Redemption[] }) {
  const [items, setItems] = useState(redemptions);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<RedemptionStatus | "all">("all");

  const visibleItems = useMemo(
    () => (activeStatus === "all" ? items : items.filter((r) => r.status === activeStatus)),
    [items, activeStatus]
  );

  async function updateStatus(id: string, status: RedemptionStatus) {
    setUpdating(id);
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await fetch(`/api/earn/redemptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      alert("Couldn't update that redemption. Try again.");
    } finally {
      setUpdating(null);
    }
  }

  if (items.length === 0) {
    return <p className="font-mono text-sm text-fog">no redemption requests yet</p>;
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => {
          const count = s === "all" ? items.length : items.filter((r) => r.status === s).length;
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
        <p className="font-mono text-sm text-fog">no {activeStatus} redemptions</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {visibleItems.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm text-ink">#{r.id.slice(0, 8)}</span>
                  <span className="font-mono text-xs text-fog">{formatDate(r.created_at)}</span>
                  <span className="font-mono text-xs text-fog">{r.kind}</span>
                </div>
                <p className="mt-1 font-mono text-sm text-ink">{r.buyer_email || "unknown"}</p>
                <p className="mt-1 font-mono text-xs text-fog">
                  {r.points_cost} pts
                  {r.kind === "cash" ? ` · ₱${r.payout_php} · ${r.gcash_number}` : ` · ${r.item_label}`}
                </p>
                {r.note && <p className="mt-2 font-mono text-xs italic text-fog">"{r.note}"</p>}
              </div>

              <select
                value={r.status}
                disabled={updating === r.id}
                onChange={(e) => updateStatus(r.id, e.target.value as RedemptionStatus)}
                className="shrink-0 border border-line bg-transparent px-2 py-1 font-mono text-xs text-ink outline-none focus:border-ink"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-paper text-ink">
                    {s}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
