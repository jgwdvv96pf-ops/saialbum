"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BlackjackLobby() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/earn/me")
      .then((res) => {
        setSignedIn(res.ok);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/blackjack/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create room");
      router.push(`/blackjack/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const res = await fetch(`/api/blackjack/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join room");
      router.push(`/blackjack/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setJoining(false);
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
        <h1 className="font-display text-3xl italic">blackjack</h1>
        <p className="mt-4 font-mono text-xs text-fog">
          sign in on <a href="/earn" className="underline">/earn</a> first — the table uses your points balance as chips.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-center font-display text-3xl italic">blackjack</h1>
      <p className="mt-2 text-center font-mono text-xs text-fog">
        play-money only — uses your /earn points as chips
      </p>

      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="your name at the table"
        className="mt-8 w-full border-b border-line bg-transparent py-2 text-center font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
      />

      <button
        onClick={handleCreate}
        disabled={creating}
        className="mx-auto mt-8 block font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
      >
        {creating ? "creating…" : "start a new table"}
      </button>

      <div className="my-8 text-center font-mono text-xs text-fog">or</div>

      <form onSubmit={handleJoin} className="flex items-center justify-center gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="room code"
          maxLength={5}
          className="w-32 border-b border-line bg-transparent py-2 text-center font-mono text-sm uppercase tracking-widest outline-none placeholder:text-fog focus:border-ink"
        />
        <button
          type="submit"
          disabled={joining}
          className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
        >
          join
        </button>
      </form>

      {error && <p className="mt-4 text-center font-mono text-xs text-red-700">{error}</p>}
    </main>
  );
}
