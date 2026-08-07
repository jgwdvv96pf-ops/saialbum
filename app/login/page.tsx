"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (res.ok) {
      router.push(params.get("next") || "/upload");
      router.refresh();
    } else {
      setError("wrong passcode");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <a
        href="/"
        className="mb-10 font-mono text-xs text-fog transition hover:text-ink"
      >
        ← back
      </a>
      <h1 className="mb-8 font-display text-3xl italic">unlock</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="passcode"
          className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />
        {error && (
          <p className="font-mono text-xs text-red-700">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !passcode}
          className="mt-2 self-start font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
        >
          {loading ? "checking…" : "enter"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
