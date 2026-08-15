"use client";

import { useEffect, useState } from "react";
import type { MailListItem, MailFolder } from "@/lib/mail/zoho";
import ComposeModal from "@/components/mail/ComposeModal";

const PAGE_SIZE = 25;

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ComposeState =
  | { open: false }
  | {
      open: true;
      mode: "new" | "reply" | "forward";
      replyToMessageId?: string;
      initialTo?: string;
      initialSubject?: string;
      initialContent?: string;
    };

export default function MailApp() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [messages, setMessages] = useState<MailListItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<MailListItem | null>(null);
  const [content, setContent] = useState("");
  const [contentLoading, setContentLoading] = useState(false);

  const [compose, setCompose] = useState<ComposeState>({ open: false });

  async function loadFolders() {
    const res = await fetch("/api/mail/folders");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load folders");
    setFolders(data.folders);
    const inbox = (data.folders as MailFolder[]).find((f) => f.folderName.toLowerCase() === "inbox");
    return inbox?.folderId || data.folders[0]?.folderId || null;
  }

  async function loadFolderMessages(folderId: string, start = 1) {
    const res = await fetch(`/api/mail/messages?folderId=${folderId}&start=${start}&limit=${PAGE_SIZE}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load messages");
    return data.messages as MailListItem[];
  }

  async function init() {
    setLoading(true);
    setLoadError("");
    try {
      const inboxId = await loadFolders();
      if (!inboxId) throw new Error("No folders found");
      setCurrentFolderId(inboxId);
      const msgs = await loadFolderMessages(inboxId, 1);
      setMessages(msgs);
      setHasMore(msgs.length === PAGE_SIZE);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load mail");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
  }, []);

  async function switchFolder(folderId: string) {
    setCurrentFolderId(folderId);
    setSelected(null);
    setSearchQuery("");
    setLoading(true);
    setLoadError("");
    try {
      const msgs = await loadFolderMessages(folderId, 1);
      setMessages(msgs);
      setHasMore(msgs.length === PAGE_SIZE);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      if (searchQuery) {
        const res = await fetch(
          `/api/mail/search?q=${encodeURIComponent(searchQuery)}&start=${messages.length + 1}&limit=${PAGE_SIZE}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessages((prev) => [...prev, ...data.messages]);
        setHasMore(data.messages.length === PAGE_SIZE);
      } else if (currentFolderId) {
        const msgs = await loadFolderMessages(currentFolderId, messages.length + 1);
        setMessages((prev) => [...prev, ...msgs]);
        setHasMore(msgs.length === PAGE_SIZE);
      }
    } catch {
      // best-effort — just stop offering "load more" on failure
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearching(true);
    setLoadError("");
    setSelected(null);
    try {
      const res = await fetch(`/api/mail/search?q=${encodeURIComponent(searchInput.trim())}&limit=${PAGE_SIZE}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setSearchQuery(searchInput.trim());
      setMessages(data.messages);
      setHasMore(data.messages.length === PAGE_SIZE);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchInput("");
    if (currentFolderId) switchFolder(currentFolderId);
  }

  async function openMessage(msg: MailListItem) {
    setSelected(msg);
    setContent("");
    setContentLoading(true);
    try {
      const res = await fetch(`/api/mail/messages?folderId=${msg.folderId}&messageId=${msg.messageId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContent(data.content);
      setMessages((prev) => prev.map((m) => (m.messageId === msg.messageId ? { ...m, unread: false } : m)));
    } catch {
      setContent("<p>Couldn't load this message.</p>");
    } finally {
      setContentLoading(false);
    }
  }

  function openReply(mode: "reply" | "forward") {
    if (!selected) return;
    const quoted = `<br><br><blockquote style="border-left:2px solid #ccc;padding-left:8px;color:#666">${content}</blockquote>`;
    setCompose({
      open: true,
      mode,
      replyToMessageId: selected.messageId,
      initialTo: mode === "reply" ? selected.senderEmail || "" : "",
      initialSubject: `${mode === "reply" ? "Re" : "Fwd"}: ${selected.subject}`,
      initialContent: quoted,
    });
  }

  if (loadError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="max-w-sm font-mono text-xs text-red-700">{loadError}</p>
        {loadError.includes("connect") && (
          <a href="/mail/connect" className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink">
            go to /mail/connect
          </a>
        )}
        <button onClick={init} className="font-mono text-xs text-fog underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink">
          try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setCompose({ open: true, mode: "new" })}
          className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
        >
          compose
        </button>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="search mail…"
            className="w-40 border-b border-line bg-transparent py-1 font-mono text-xs outline-none placeholder:text-fog focus:border-ink sm:w-56"
          />
          <button type="submit" disabled={searching} className="font-mono text-xs text-fog transition hover:text-ink">
            {searching ? "…" : "go"}
          </button>
          {searchQuery && (
            <button type="button" onClick={clearSearch} className="font-mono text-xs text-fog transition hover:text-ink">
              clear
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <p className="font-mono text-xs text-fog">loading…</p>
      ) : (
        <div className="flex flex-1 gap-6 overflow-hidden">
          {/* folder sidebar */}
          <ul className="hidden w-40 shrink-0 flex-col gap-1 overflow-y-auto md:flex">
            {folders.map((f) => (
              <li key={f.folderId}>
                <button
                  onClick={() => switchFolder(f.folderId)}
                  className={`w-full truncate rounded-sm px-2 py-1.5 text-left font-mono text-xs transition ${
                    currentFolderId === f.folderId && !searchQuery
                      ? "bg-line/60 text-ink"
                      : "text-fog hover:text-ink"
                  }`}
                >
                  {f.folderName}
                  {f.unreadCount > 0 ? ` (${f.unreadCount})` : ""}
                </button>
              </li>
            ))}
          </ul>

          {/* message list */}
          <ul className="w-full shrink-0 divide-y divide-line overflow-y-auto border-r border-line pr-4 sm:w-72">
            {searchQuery && (
              <li className="pb-2 font-mono text-[11px] text-fog">
                results for &ldquo;{searchQuery}&rdquo;
              </li>
            )}
            {messages.length === 0 && <li className="py-4 font-mono text-xs text-fog">nothing here</li>}
            {messages.map((m) => (
              <li key={m.messageId}>
                <button
                  onClick={() => openMessage(m)}
                  className={`block w-full py-3 text-left transition hover:bg-line/40 ${
                    selected?.messageId === m.messageId ? "bg-line/40" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate font-mono text-xs ${m.unread ? "font-semibold text-ink" : "text-fog"}`}>
                      {m.sender}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-fog">{formatDate(m.receivedTime)}</span>
                  </div>
                  <p className={`truncate font-mono text-xs ${m.unread ? "text-ink" : "text-fog"}`}>{m.subject}</p>
                  <p className="truncate font-mono text-[11px] text-fog">{m.summary}</p>
                </button>
              </li>
            ))}
            {hasMore && messages.length > 0 && (
              <li className="py-3">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="font-mono text-xs text-fog underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink disabled:opacity-40"
                >
                  {loadingMore ? "loading…" : "load more"}
                </button>
              </li>
            )}
          </ul>

          {/* reading pane */}
          <div className="hidden flex-1 overflow-y-auto sm:block">
            {!selected ? (
              <p className="font-mono text-xs text-fog">select a message</p>
            ) : contentLoading ? (
              <p className="font-mono text-xs text-fog">loading…</p>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl italic">{selected.subject}</p>
                    <p className="mt-1 font-mono text-xs text-fog">
                      {selected.sender} · {formatDate(selected.receivedTime)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      onClick={() => openReply("reply")}
                      className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
                    >
                      reply
                    </button>
                    <button
                      onClick={() => openReply("forward")}
                      className="font-mono text-xs text-fog underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-ink"
                    >
                      forward
                    </button>
                  </div>
                </div>
                <iframe srcDoc={content} sandbox="" className="mt-4 h-[55vh] w-full rounded-sm border border-line bg-white" />
              </div>
            )}
          </div>
        </div>
      )}

      {compose.open && (
        <ComposeModal
          mode={compose.mode}
          replyToMessageId={compose.replyToMessageId}
          initialTo={compose.initialTo}
          initialSubject={compose.initialSubject}
          initialContent={compose.initialContent}
          onClose={() => setCompose({ open: false })}
        />
      )}
    </div>
  );
}
