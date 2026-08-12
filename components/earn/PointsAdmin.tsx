"use client";

import { useState } from "react";
import type { AdminUserLookup, PointAdjustment } from "@/lib/earn/adjustments";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PointsAdmin({ recent }: { recent: PointAdjustment[] }) {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<AdminUserLookup | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState("");
  const [adjustSuccess, setAdjustSuccess] = useState("");
  const [history, setHistory] = useState(recent);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError("");
    setAdjustSuccess("");
    setUser(null);
    setLookingUp(true);
    try {
      const res = await fetch(`/api/earn/admin/users?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setUser(data.user);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Not found");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setAdjustError("");
    setAdjustSuccess("");

    const delta = Number(points);
    if (!Number.isFinite(delta) || delta === 0) {
      setAdjustError("Enter a non-zero number of points");
      return;
    }

    setAdjusting(true);
    try {
      const res = await fetch("/api/earn/admin/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, points: delta, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adjustment failed");

      setUser({ ...user, balance: data.balance });
      setAdjustSuccess(`${delta > 0 ? "+" : ""}${delta} pts — new balance: ${data.balance}`);
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          user_id: user.id,
          points: delta,
          reason: reason || null,
          created_at: new Date().toISOString(),
          email: user.email,
        },
        ...prev,
      ]);
      setPoints("");
      setReason("");
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setAdjusting(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user's email"
            className="flex-1 border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
          />
          <button
            type="submit"
            disabled={lookingUp || !email.trim()}
            className="shrink-0 font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
          >
            {lookingUp ? "looking up…" : "look up"}
          </button>
        </form>
        {lookupError && <p className="mt-2 font-mono text-xs text-red-700">{lookupError}</p>}

        {user && (
          <div className="mt-4 rounded-sm border border-line p-4">
            <p className="font-mono text-sm text-ink">{user.email}</p>
            <p className="mt-1 font-mono text-xs text-fog">
              balance: <span className="text-ink">{user.balance} pts</span> · spins:{" "}
              <span className="text-ink">{user.spin_credits}</span>
            </p>

            <form onSubmit={handleAdjust} className="mt-4 flex flex-col gap-3">
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="points (e.g. 100 or -50)"
                className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
              />
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="reason (optional — e.g. giveaway winner)"
                className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
              />
              {adjustError && <p className="font-mono text-xs text-red-700">{adjustError}</p>}
              {adjustSuccess && <p className="font-mono text-xs text-green-700">{adjustSuccess}</p>}
              <button
                type="submit"
                disabled={adjusting}
                className="self-start font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
              >
                {adjusting ? "applying…" : "apply adjustment"}
              </button>
            </form>
          </div>
        )}
      </div>

      <div>
        <p className="mb-3 font-mono text-xs text-fog">recent adjustments</p>
        {history.length === 0 ? (
          <p className="font-mono text-sm text-fog">none yet</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line border-t border-line">
            {history.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-mono text-xs text-ink">{a.email}</p>
                  {a.reason && <p className="font-mono text-xs text-fog">{a.reason}</p>}
                </div>
                <div className="text-right">
                  <p className={`font-mono text-sm ${a.points > 0 ? "text-green-700" : "text-red-700"}`}>
                    {a.points > 0 ? "+" : ""}
                    {a.points}
                  </p>
                  <p className="font-mono text-[10px] text-fog">{formatDate(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
