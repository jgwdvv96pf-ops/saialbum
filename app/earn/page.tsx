"use client";

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Wheel from "@/components/earn/Wheel";
import AdSimulator from "@/components/earn/AdSimulator";
import SignInButton from "@/components/earn/SignInButton";
import type { Prize } from "@/lib/earn/prizes";

type SpinResponse = {
  prize: Prize;
  index: number;
  balance: number;
  spinCredits: number;
};

export default function EarnPage() {
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [spinCredits, setSpinCredits] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [pendingResult, setPendingResult] = useState<SpinResponse | null>(null);
  const [result, setResult] = useState<Prize | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  async function loadMe() {
    try {
      const res = await fetch("/api/earn/me");
      if (res.status === 401) {
        setSignedIn(false);
        setChecked(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setEmail(data.email);
      setPoints(data.balance);
      setSpinCredits(data.spinCredits);
      setSignedIn(true);
      setChecked(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load — try refreshing");
      setChecked(true);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function handleSignOut() {
    await fetch("/api/earn/session", { method: "DELETE" });
    await signOut(auth).catch(() => {});
    setSignedIn(false);
    setResult(null);
  }

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

  if (!checked) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-3xl italic">earn</h1>
        <p className="font-mono text-xs text-fog">loading…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-3xl italic">earn</h1>
        <p className="max-w-sm font-mono text-xs text-red-700">{loadError}</p>
        <button
          onClick={() => {
            setLoadError("");
            setChecked(false);
            loadMe();
          }}
          className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          try again
        </button>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-3xl italic">earn</h1>
        <p className="font-mono text-xs text-fog">
          sign in to watch ads, spin, and earn points
        </p>
        <SignInButton onSignedIn={loadMe} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 text-center">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl italic">earn</h1>
        <button
          onClick={handleSignOut}
          className="font-mono text-xs text-fog transition hover:text-ink"
        >
          {email || "sign out"}
        </button>
      </div>
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

        {error && <p className="font-mono text-xs text-red-700">{error}</p>}

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
          signed in with Firebase, balance persists in Postgres. ad
          watching is still simulated — a real ad network's server
          callback comes next.
        </p>
      </div>

      {showAd && <AdSimulator onComplete={handleAdComplete} onCancel={() => setShowAd(false)} />}
    </main>
  );
}
