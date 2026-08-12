"use client";

import { useEffect, useCallback, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/manifest";
import type { Note } from "@/lib/notes";

function formatDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export default function Lightbox({
  photos,
  index,
  authed,
  onClose,
  onNavigate,
  onCaptionSave,
}: {
  photos: Photo[];
  index: number;
  authed: boolean;
  onClose: () => void;
  onNavigate: (i: number) => void;
  onCaptionSave: (key: string, caption: string) => void;
}) {
  const photo = photos[index];
  const [editing, setEditing] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteText, setNoteText] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  const next = useCallback(
    () => onNavigate((index + 1) % photos.length),
    [index, photos.length, onNavigate]
  );
  const prev = useCallback(
    () => onNavigate((index - 1 + photos.length) % photos.length),
    [index, photos.length, onNavigate]
  );

  useEffect(() => {
    setEditing(false);
    setAddingNote(false);
    setNoteError("");
  }, [index]);

  useEffect(() => {
    if (!photo) return;
    setNotesLoaded(false);
    fetch(`/api/notes?photoKey=${encodeURIComponent(photo.key)}`)
      .then((res) => res.json())
      .then((data) => setNotes(data.notes || []))
      .catch(() => setNotes([]))
      .finally(() => setNotesLoaded(true));
  }, [photo]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing || addingNote) {
        if (e.key === "Escape") {
          setEditing(false);
          setAddingNote(false);
        }
        return;
      }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, next, prev, editing, addingNote]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return;
    setNoteError("");

    if (!noteAuthor.trim() || !noteText.trim()) {
      setNoteError("name and note are both required");
      return;
    }

    setPostingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoKey: photo.key,
          author: noteAuthor.trim(),
          text: noteText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");

      setNotes((prev) => [...prev, data.note]);
      setNoteText("");
      setAddingNote(false);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPostingNote(false);
    }
  }

  async function handleDeleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // best-effort
    }
  }

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/95"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="fixed right-4 top-4 z-20 font-mono text-sm text-white/70 transition hover:text-white sm:right-8 sm:top-8"
        aria-label="Close"
      >
        close ×
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        className="fixed left-2 top-1/2 z-20 -translate-y-1/2 font-mono text-2xl text-white/50 transition hover:text-white sm:left-6"
        aria-label="Previous photo"
      >
        ‹
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        className="fixed right-2 top-1/2 z-20 -translate-y-1/2 font-mono text-2xl text-white/50 transition hover:text-white sm:right-6"
        aria-label="Next photo"
      >
        ›
      </button>

      {/* scrolls as a whole if content is taller than the viewport (long
          captions/notes on mobile) — centers normally when it fits */}
      <div className="h-full overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 py-16 sm:p-10">
          {/* image + right panel, grouped as one block */}
          <div
            className="flex w-full max-w-3xl flex-col items-stretch sm:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photo.url}
              alt=""
              width={photo.width}
              height={photo.height}
              className="h-auto max-h-[70vh] w-auto min-w-0 max-w-full rounded-t-sm object-contain sm:max-h-[80vh] sm:rounded-l-sm sm:rounded-tr-none"
              priority
            />

            <div className="flex w-full flex-col bg-black/40 sm:w-72 sm:shrink-0 sm:rounded-r-sm sm:max-h-[80vh]">
              {/* caption section */}
              <div className="flex-[5] p-4 sm:overflow-y-auto sm:p-5">
                <p className="font-mono text-[10px] tracking-wide text-white/40">
                  {formatDate(photo.takenAt)}
                </p>
                {photo.location && (
                  <p className="mt-1 font-mono text-xs text-white/60">{photo.location}</p>
                )}

                {editing ? (
                  <textarea
                    autoFocus
                    defaultValue={photo.caption || ""}
                    placeholder="add a caption"
                    rows={5}
                    onBlur={(e) => {
                      onCaptionSave(photo.key, e.target.value.trim());
                      setEditing(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditing(false);
                    }}
                    className="mt-3 w-full resize-none rounded-sm bg-white/5 px-2 py-2 font-hand text-2xl italic leading-[1.05] text-white outline-none placeholder:text-white/40"
                  />
                ) : (
                  <p
                    role={authed ? "button" : undefined}
                    onClick={() => authed && setEditing(true)}
                    className={`mt-3 whitespace-pre-wrap font-hand text-2xl italic leading-[1.05] ${
                      photo.caption ? "text-white/90" : "text-white/40"
                    } ${authed ? "cursor-pointer hover:text-white" : ""}`}
                  >
                    {photo.caption || (authed ? "add a caption" : "")}
                  </p>
                )}
              </div>

              {/* notes / guestbook section */}
              <div className="flex-[3] border-t border-white/10 p-4 sm:flex sm:flex-col sm:overflow-y-auto sm:p-5">
                <p className="font-mono text-[10px] uppercase tracking-wide text-white/40">
                  notes {notesLoaded && `· ${notes.length}`}
                </p>

                <ul className="mt-3 flex flex-col gap-3 sm:flex-1 sm:overflow-y-auto">
                  {notes.map((note) => (
                    <li key={note.id} className="group">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-mono text-xs text-white/60">{note.author}</p>
                        {authed && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="font-mono text-[10px] text-white/0 transition group-hover:text-white/40 hover:!text-white/80"
                          >
                            remove
                          </button>
                        )}
                      </div>
                      <p className="font-hand text-lg italic leading-tight text-white/90">
                        {note.text}
                      </p>
                    </li>
                  ))}
                  {notesLoaded && notes.length === 0 && (
                    <li className="font-mono text-xs text-white/30">no notes yet</li>
                  )}
                </ul>

                {addingNote ? (
                  <form onSubmit={handleAddNote} className="mt-3 flex flex-col gap-1.5">
                    <input
                      autoFocus
                      value={noteAuthor}
                      onChange={(e) => setNoteAuthor(e.target.value)}
                      placeholder="name"
                      maxLength={40}
                      className="rounded-sm bg-white/5 px-2 py-1.5 font-mono text-xs text-white outline-none placeholder:text-white/30"
                    />
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="say something"
                      rows={2}
                      maxLength={300}
                      className="resize-none rounded-sm bg-white/5 px-2 py-1.5 font-mono text-xs text-white outline-none placeholder:text-white/30"
                    />
                    {noteError && (
                      <p className="font-mono text-[10px] text-red-400">{noteError}</p>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={postingNote}
                        className="font-mono text-xs text-white/80 underline decoration-white/20 underline-offset-4 hover:text-white disabled:opacity-40"
                      >
                        {postingNote ? "posting…" : "post"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingNote(false)}
                        className="font-mono text-xs text-white/40 hover:text-white/70"
                      >
                        cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setAddingNote(true)}
                    className="mt-3 text-left font-mono text-xs text-white/40 transition hover:text-white/80"
                  >
                    + leave a note
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
