"use client";

import { useEffect, useState } from "react";

const RATE = 0.1; // mirrors lib/earn/config.ts POINTS_TO_PHP_RATE
const MIN_CASH = 500;
const MIN_ITEM = 200;

export default function RedeemPage() {
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [balance, setBalance] = useState(0);
  const [kind, setKind] = useState<"cash" | "item">("cash");
  const [points, setPoints] = useState("");
  const [gcashNumber, setGcashNumber] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  useEffect(() => {
    fetch("/api/earn/me")
      .then((res) => {
        if (res.status === 401) {
          setSignedIn(false);
          setChecked(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setBalance(data.balance);
          setSignedIn(true);
        }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  const pointsNum = Number(points) || 0;
  const min = kind === "cash" ? MIN_CASH : MIN_ITEM;
  const payoutPreview = Math.round(pointsNum * RATE * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (pointsNum <= 0 || pointsNum > balance) {
      setError("Enter a valid points amount within your balance");
      return;
    }
    if (pointsNum < min) {
      setError(`Minimum ${min} points for ${kind} redemption`);
      return;
    }
    if (kind === "cash" && !gcashNumber.trim()) {
      setError("GCash number required");
      return;
    }
    if (kind === "item" && !itemLabel.trim()) {
      setError("Describe what item you want");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/earn/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          points: pointsNum,
          gcashNumber: kind === "cash" ? gcashNumber : undefined,
          itemLabel: kind === "item" ? itemLabel : undefined,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSuccess({ id: data.redemption.id });
      setBalance((b) => b - pointsNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!checked) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-mono text-xs text-fog">loading…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-mono text-xs text-fog">
          sign in on <a href="/earn" className="underline">/earn</a> first
        </p>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-display text-2xl italic">request sent</p>
        <p className="mt-2 font-mono text-xs text-fog">
          reference: <span className="text-ink">#{success.id.slice(0, 8)}</span>
        </p>
        <p className="mt-4 font-mono text-xs text-fog">
          it's queued for review — you'll be paid out or arranged with once approved.
        </p>
        <a
          href="/earn"
          className="mt-6 inline-block font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          ← back to earn
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-14">
      <a href="/earn" className="font-mono text-xs text-fog transition hover:text-ink">
        ← back to earn
      </a>
      <h1 className="mb-2 mt-6 font-display text-3xl italic">redeem</h1>
      <p className="mb-8 font-mono text-xs text-fog">
        balance: <span className="text-ink">{balance} pts</span>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-4 font-mono text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={kind === "cash"}
              onChange={() => setKind("cash")}
            />
            cash (GCash)
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={kind === "item"}
              onChange={() => setKind("item")}
            />
            pre-loved item
          </label>
        </div>

        <div>
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder={`points to redeem (min ${min})`}
            className="w-full border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
          />
          {kind === "cash" && pointsNum > 0 && (
            <p className="mt-1 font-mono text-[11px] text-fog">≈ ₱{payoutPreview}</p>
          )}
        </div>

        {kind === "cash" ? (
          <input
            value={gcashNumber}
            onChange={(e) => setGcashNumber(e.target.value)}
            placeholder="GCash number"
            className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
          />
        ) : (
          <input
            value={itemLabel}
            onChange={(e) => setItemLabel(e.target.value)}
            placeholder="which item / describe it"
            className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
          />
        )}

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="note (optional)"
          rows={3}
          className="resize-none border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />

        {error && <p className="font-mono text-xs text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="self-start font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
        >
          {submitting ? "submitting…" : "request redemption"}
        </button>

        <p className="font-mono text-[11px] text-fog">
          points are held immediately on request. if it's rejected, they're refunded.
        </p>
      </form>
    </main>
  );
}
