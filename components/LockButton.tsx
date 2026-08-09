"use client";

import { useRouter } from "next/navigation";

export default function LockButton() {
  const router = useRouter();

  async function handleLock() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLock}
      className="font-mono text-xs text-fog transition hover:text-ink"
    >
      lock
    </button>
  );
}
