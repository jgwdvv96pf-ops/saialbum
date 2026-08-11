"use client";

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";

export default function SignInButton({ onSignedIn }: { onSignedIn: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/earn/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("Failed to establish session");

      onSignedIn();
    } catch {
      setError("Sign-in failed — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
      >
        {loading ? "signing in…" : "sign in with google"}
      </button>
      {error && <p className="font-mono text-xs text-red-700">{error}</p>}
    </div>
  );
}
