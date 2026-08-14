"use client";

import { useState } from "react";

export default function ComposeModal({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, content: content.replace(/\n/g, "<br>") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <form
        onSubmit={handleSend}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col gap-3 rounded-sm bg-paper p-6"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-xl italic">new message</p>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-fog transition hover:text-ink"
          >
            close ×
          </button>
        </div>

        <input
          required
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="to"
          className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="subject"
          className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />
        <textarea
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="write something…"
          rows={10}
          className="resize-none rounded-sm bg-line/40 px-3 py-2 font-body text-sm outline-none placeholder:text-fog"
        />

        {error && <p className="font-mono text-xs text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={sending}
          className="self-start font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
        >
          {sending ? "sending…" : "send"}
        </button>
      </form>
    </div>
  );
}
