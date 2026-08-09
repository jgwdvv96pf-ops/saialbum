"use client";

import { useEffect, useState } from "react";
import Wheel from "@/components/earn/Wheel";
import AdSimulator from "@/components/earn/AdSimulator";
import type { Prize } from "@/lib/earn/prizes";

type SpinResponse = {
  prize: Prize;
  index: number;
  balance: number;
  spinCredits: number;
};

export default function EarnPage() {
  const [loaded, setLoaded] = useState(false);
  const [points, setPoints] = useState(0);
  const [spinCredits, setSpinCredits] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [pendingResult, setPendingResult] = useState<SpinResponse | null>(null);
  const [result, setResult] = useState<Prize | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/earn/me")
      .then((res) => res.json())
      .then((data) => {
        setPoints(data.balance);
        setSpinCredits(data.spinCredits);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function startSpin() {
    if (spinCredits <= 0 || spinning) return;
    setResult(null);
    setError("");

    const res = await fetch("/api/earn/spin", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    // Server already deducted the credit and updated balance — hold
    // onto the result and only reflect it once the wheel finishes
    // animating, so the numbers don't jump before the spin visually lands.
    setPendingResult(data as SpinResponse);
    setTargetIndex(data.index);
    setSpinning(true);
  }

  function handleSpinEnd() {
    setSpinning(false);
    if (!pendingResult) return;
    setResult(pendingResult.prize);
    setPoints(pendingResult.balance);
    setSpinCredits(pendingResult.spinCredits);
    setPendingResult(null);
  }

  async function handleAdComplete() {
    setShowAd(false);
    const res = await fetch("/api/earn/ad-complete", { method: "POST" });
    const data = await res.json();
    if (res.ok) setSpinCredits(data.spinCredits);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 text-center">
      <h1 className="font-display text-3xl italic">earn</h1>
      <p className="mt-2 font-mono text-xs text-fog">
        watch an ad, get a spin, win points
      </p>

      <div className="mx-auto mt-3 w-fit rounded-sm border border-line px-4 py-2">
        <p className="font-mono text-xs text-fog">
          balance: <span className="text-ink">{loaded ? points : "…"} pts</span> · spins:{" "}
          <span className="text-ink">{loaded ? spinCredits : "…"}</span>
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

        {error && <p className="font-mono text-xs text-red-700">{error}</p>}

        {spinCredits > 0 ? (
          <button
            onClick={startSpin}
            disabled={spinning || !loaded}
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
          >
            {spinning ? "spinning…" : "spin the wheel"}
          </button>
        ) : (
          <button
            onClick={() => setShowAd(true)}
            disabled={!loaded}
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
          >
            watch ad for a spin
          </button>
        )}

        <p className="max-w-xs font-mono text-[11px] text-fog">
          balance persists now (Postgres) — identity is still a
          placeholder cookie, not a real account. real ad network +
          Firebase Auth come next.
        </p>
      </div>

      {showAd && <AdSimulator onComplete={handleAdComplete} onCancel={() => setShowAd(false)} />}
    </main>
  );
}
