"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/manifest";
import Lightbox from "@/components/Lightbox";

function formatDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toLowerCase();
}

export default function Gallery({
  photos,
  authed,
}: {
  photos: Photo[];
  authed: boolean;
}) {
  const [items, setItems] = useState(photos);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<string>("all");

  const dragKey = useRef<string | null>(null);
  const dragging = useRef(false);

  const albums = useMemo(() => {
    const seen = new Set<string>();
    for (const p of items) if (p.album) seen.add(p.album);
    return [...seen].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [items]);

  const visibleItems = useMemo(
    () =>
      activeAlbum === "all"
        ? items
        : items.filter((p) => p.album === activeAlbum),
    [items, activeAlbum]
  );

  async function handleDelete(e: React.MouseEvent, key: string) {
    e.stopPropagation();
    if (!confirm("Delete this photo? This can't be undone.")) return;

    setDeleting(key);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((p) => p.key !== key));
    } catch {
      alert("Couldn't delete that photo. Try again.");
    } finally {
      setDeleting(null);
    }
  }

  function handleDragStart(key: string) {
    dragKey.current = key;
    dragging.current = true;
  }

  function handleDragOver(e: React.DragEvent, overKey: string) {
    if (!authed) return;
    e.preventDefault();
    if (dragKey.current === null || dragKey.current === overKey) return;

    setItems((prev) => {
      const from = prev.findIndex((p) => p.key === dragKey.current);
      const to = prev.findIndex((p) => p.key === overKey);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handleDragEnd() {
    dragging.current = false;
    const key = dragKey.current;
    dragKey.current = null;
    if (!authed || !key) return;

    setSavingOrder(true);
    try {
      await fetch("/api/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: items.map((p) => p.key) }),
      });
    } catch {
      // best-effort — order will just re-sort back on next load
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleFieldSave(
    key: string,
    field: "location" | "album" | "caption",
    value: string
  ) {
    setItems((prev) =>
      prev.map((p) => (p.key === key ? { ...p, [field]: value } : p))
    );
    try {
      await fetch("/api/manifest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, [field]: value }),
      });
    } catch {
      alert(`Couldn't save that ${field}. Try again.`);
    }
  }

  return (
    <>
      {albums.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveAlbum("all")}
            className={`font-mono text-xs underline-offset-4 transition ${
              activeAlbum === "all"
                ? "text-ink underline decoration-ink"
                : "text-fog underline decoration-line hover:decoration-ink"
            }`}
          >
            all
          </button>
          {albums.map((a) => (
            <button
              key={a}
              onClick={() => setActiveAlbum(a)}
              className={`font-mono text-xs underline-offset-4 transition ${
                activeAlbum === a
                  ? "text-ink underline decoration-ink"
                  : "text-fog underline decoration-line hover:decoration-ink"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {authed && (
        <p className="mb-4 font-mono text-[11px] text-fog">
          drag photos to reorder · click the location to edit info
          {savingOrder && " · saving…"}
        </p>
      )}

      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {visibleItems.map((photo) => {
          const i = items.findIndex((p) => p.key === photo.key);
          return (
            <div
              key={photo.key}
              draggable={authed}
              onDragStart={() => handleDragStart(photo.key)}
              onDragOver={(e) => handleDragOver(e, photo.key)}
              onDragEnd={handleDragEnd}
              className={`group relative mb-3 block w-full overflow-hidden break-inside-avoid rounded-sm bg-line text-left sm:mb-4 ${
                authed ? "cursor-grab active:cursor-grabbing" : ""
              } ${dragging.current && dragKey.current === photo.key ? "opacity-50" : ""}`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                className="block w-full"
                style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
              >
                <Image
                  src={photo.url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                <span className="pointer-events-none absolute bottom-2 left-2 font-mono text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  {formatDate(photo.takenAt)}
                  {photo.location ? ` · ${photo.location}` : ""}
                </span>
              </button>

              {authed && editingKey === photo.key && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-x-2 bottom-2 z-10 flex flex-col gap-1"
                >
                  <input
                    autoFocus
                    defaultValue={photo.location || ""}
                    placeholder="location"
                    onBlur={(e) =>
                      handleFieldSave(photo.key, "location", e.target.value.trim())
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingKey(null);
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="w-full rounded-sm bg-black/70 px-2 py-1 font-mono text-[10px] text-white outline-none backdrop-blur placeholder:text-white/50"
                  />
                  <input
                    defaultValue={photo.album || ""}
                    placeholder="album"
                    onBlur={(e) =>
                      handleFieldSave(photo.key, "album", e.target.value.trim())
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingKey(null);
                      if (e.key === "Enter") {
                        (e.target as HTMLInputElement).blur();
                        setEditingKey(null);
                      }
                    }}
                    className="w-full rounded-sm bg-black/70 px-2 py-1 font-mono text-[10px] text-white outline-none backdrop-blur placeholder:text-white/50"
                  />
                </div>
              )}

              {authed && editingKey !== photo.key && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingKey(photo.key);
                  }}
                  className="absolute bottom-2 left-2 z-10 rounded-sm bg-black/50 px-2 py-1 font-mono text-[10px] text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100"
                >
                  {photo.location || "add location"}
                  {photo.album ? ` · ${photo.album}` : ""}
                </span>
              )}

              {authed && (
                <span
                  role="button"
                  onClick={(e) => handleDelete(e, photo.key)}
                  className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 font-mono text-xs text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100"
                  aria-label="Delete photo"
                >
                  {deleting === photo.key ? "…" : "×"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={items}
          index={openIndex}
          authed={authed}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
          onCaptionSave={(key, caption) =>
            handleFieldSave(key, "caption", caption)
          }
        />
      )}
    </>
  );
}
