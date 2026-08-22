"use client";

import { useState } from "react";

type Mode = "new" | "reply" | "forward";

export default function ComposeModal({
  mode = "new",
  replyToMessageId,
  initialTo = "",
  initialSubject = "",
  initialContent = "",
  onClose,
}: {
  mode?: Mode;
  replyToMessageId?: string;
  initialTo?: string;
  initialSubject?: string;
  initialContent?: string;
  onClose: () => void;
}) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [content, setContent] = useState(initialContent);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const isReplyOrForward = mode === "reply" || mode === "forward";
      const res = await fetch(isReplyOrForward ? "/api/mail/reply" : "/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isReplyOrForward
            ? { messageId: replyToMessageId, action: mode, to, subject, content }
            : { to, subject, content: content.replace(/\n/g, "<br>") }
        ),
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

  const title = mode === "reply" ? "reply" : mode === "forward" ? "forward" : "new message";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSend}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[92vh] w-full max-w-xl flex-col rounded-t-lg bg-paper sm:h-auto sm:max-h-[85vh] sm:rounded-lg"
      >
        {/* header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
          <p className="font-display text-xl italic">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-fog transition hover:text-ink"
          >
            close ×
          </button>
        </div>

        {/* recipient / subject block */}
        <div className="shrink-0 divide-y divide-line border-b border-line">
          <div className="flex items-center gap-3 px-6 py-3">
            <label className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-wide text-fog">to</label>
            <input
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com"
              className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-fog/60"
            />
          </div>
          <div className="flex items-center gap-3 px-6 py-3">
            <label className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-wide text-fog">subject</label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="—"
              className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-fog/60"
            />
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <textarea
            required
            autoFocus={mode === "new"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="write something…"
            className="h-full min-h-[240px] w-full resize-none bg-transparent font-body text-[15px] leading-relaxed outline-none placeholder:text-fog"
          />
        </div>

        {/* footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-line px-6 py-4">
          {error ? (
            <p className="font-mono text-xs text-red-700">{error}</p>
          ) : (
            <p className="font-mono text-[11px] text-fog">sent via saiaj.in</p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
          >
            {sending ? "sending…" : "send →"}
          </button>
        </div>
      </form>
    </div>
  );
}
