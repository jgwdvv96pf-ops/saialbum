"use client";

import { useEffect, useState } from "react";
import type { MailListItem, MailFolder } from "@/lib/mail/zoho";
import ComposeModal from "@/components/mail/ComposeModal";

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MailApp() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [inboxFolderId, setInboxFolderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MailListItem[]>([]);
  const [selected, setSelected] = useState<MailListItem | null>(null);
  const [content, setContent] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [composing, setComposing] = useState(false);

  async function loadInbox() {
    setLoading(true);
    setLoadError("");
    try {
      const foldersRes = await fetch("/api/mail/folders");
      const foldersData = await foldersRes.json();
      if (!foldersRes.ok) throw new Error(foldersData.error || "Failed to load folders");

      const inbox = (foldersData.folders as MailFolder[]).find(
        (f) => f.folderName.toLowerCase() === "inbox"
      );
      if (!inbox) throw new Error("Couldn't find an Inbox folder");
      setInboxFolderId(inbox.folderId);

      const msgRes = await fetch(`/api/mail/messages?folderId=${inbox.folderId}`);
      const msgData = await msgRes.json();
      if (!msgRes.ok) throw new Error(msgData.error || "Failed to load messages");
      setMessages(msgData.messages);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load mail");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInbox();
  }, []);

  async function openMessage(msg: MailListItem) {
    setSelected(msg);
    setContent("");
    setContentLoading(true);
    try {
      const res = await fetch(
        `/api/mail/messages?folderId=${msg.folderId}&messageId=${msg.messageId}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContent(data.content);
      setMessages((prev) =>
        prev.map((m) => (m.messageId === msg.messageId ? { ...m, unread: false } : m))
      );
    } catch {
      setContent("<p>Couldn't load this message.</p>");
    } finally {
      setContentLoading(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="max-w-sm font-mono text-xs text-red-700">{loadError}</p>
        {loadError.includes("connect") && (
          <a
            href="/mail/connect"
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
          >
            go to /mail/connect
          </a>
        )}
        <button
          onClick={loadInbox}
          className="font-mono text-xs text-fog underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink"
        >
          try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setComposing(true)}
          className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          compose
        </button>
        <button
          onClick={loadInbox}
          className="font-mono text-xs text-fog transition hover:text-ink"
        >
          refresh
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-xs text-fog">loading…</p>
      ) : (
        <div className="flex flex-1 gap-6 overflow-hidden">
          <ul className="w-full shrink-0 divide-y divide-line overflow-y-auto border-r border-line pr-4 sm:w-80">
            {messages.length === 0 && (
              <li className="py-4 font-mono text-xs text-fog">inbox is empty</li>
            )}
            {messages.map((m) => (
              <li key={m.messageId}>
                <button
                  onClick={() => openMessage(m)}
                  className={`block w-full py-3 text-left transition hover:bg-line/40 ${
                    selected?.messageId === m.messageId ? "bg-line/40" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate font-mono text-xs ${m.unread ? "font-semibold text-ink" : "text-fog"}`}
                    >
                      {m.sender}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-fog">
                      {formatDate(m.receivedTime)}
                    </span>
                  </div>
                  <p className={`truncate font-mono text-xs ${m.unread ? "text-ink" : "text-fog"}`}>
                    {m.subject}
                  </p>
                  <p className="truncate font-mono text-[11px] text-fog">{m.summary}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden flex-1 overflow-y-auto sm:block">
            {!selected ? (
              <p className="font-mono text-xs text-fog">select a message</p>
            ) : contentLoading ? (
              <p className="font-mono text-xs text-fog">loading…</p>
            ) : (
              <div>
                <p className="font-display text-xl italic">{selected.subject}</p>
                <p className="mt-1 font-mono text-xs text-fog">
                  {selected.sender} · {formatDate(selected.receivedTime)}
                </p>
                <iframe
                  srcDoc={content}
                  sandbox=""
                  className="mt-4 h-[60vh] w-full rounded-sm border border-line bg-white"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {composing && <ComposeModal onClose={() => setComposing(false)} />}
    </div>
  );
}
