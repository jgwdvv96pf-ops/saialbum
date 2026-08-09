"use client";

import { useState } from "react";
import Wheel from "@/components/earn/Wheel";
import AdSimulator from "@/components/earn/AdSimulator";
import { PRIZES, type Prize } from "@/lib/earn/prizes";

// PLACEHOLDER: balance and spin credits live in React state only —
// refresh the page and they're gone. Once Postgres + Firebase Auth
// are wired up, this becomes a real per-user balance fetched/updated
// through authenticated API calls instead of local state.
export default function EarnPage() {
  const [points, setPoints] = useState(0);
  const [spinCredits, setSpinCredits] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [result, setResult] = useState<Prize | null>(null);

  async function startSpin() {
    if (spinCredits <= 0 || spinning) return;
    setResult(null);
    setSpinCredits((c) => c - 1);

    const res = await fetch("/api/earn/spin", { method: "POST" });
    const data = await res.json();

    setTargetIndex(data.index);
    setSpinning(true);
  }

  function handleSpinEnd() {
    setSpinning(false);
    if (targetIndex === null) return;
    const prize = PRIZES[targetIndex];
    setResult(prize);
    if (prize.points > 0) setPoints((p) => p + prize.points);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 text-center">
      <h1 className="font-display text-3xl italic">earn</h1>
      <p className="mt-2 font-mono text-xs text-fog">
        watch an ad, get a spin, win points
      </p>

      <div className="mx-auto mt-3 w-fit rounded-sm border border-line px-4 py-2">
        <p className="font-mono text-xs text-fog">
          balance: <span className="text-ink">{points} pts</span> · spins:{" "}
          <span className="text-ink">{spinCredits}</span>
        </p>
      </div>

      <div className="mt-10 flex justify-center">
        <Wheel spinning={spinning} targetIndex={targetIndex} onSpinEnd={handleSpinEnd} />
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        {result && (
          <p className="font-display text-xl italic">
            {result.points > 0 ? `you won ${result.label}!` : `${result.label} — no luck this time`}
          </p>
        )}

        {spinCredits > 0 ? (
          <button
            onClick={startSpin}
            disabled={spinning}
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
          >
            {spinning ? "spinning…" : "spin the wheel"}
          </button>
        ) : (
          <button
            onClick={() => setShowAd(true)}
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
          >
            watch ad for a spin
          </button>
        )}

        <p className="max-w-xs font-mono text-[11px] text-fog">
          prototype — balance resets on refresh, spins aren't rate-limited
          yet. real ad network + accounts + persistence come next.
        </p>
      </div>

      {showAd && (
        <AdSimulator
          onComplete={() => {
            setShowAd(false);
            setSpinCredits((c) => c + 1);
          }}
          onCancel={() => setShowAd(false)}
        />
      )}
    </main>
  );
}
