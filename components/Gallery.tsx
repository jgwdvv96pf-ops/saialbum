"use client";

import { useState } from "react";
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

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {items.map((photo, i) => (
          <button
            key={photo.key}
            onClick={() => setOpenIndex(i)}
            className="group relative mb-3 block w-full overflow-hidden break-inside-avoid rounded-sm bg-line text-left sm:mb-4"
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
            </span>
            {authed && (
              <span
                role="button"
                onClick={(e) => handleDelete(e, photo.key)}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 font-mono text-xs text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100"
                aria-label="Delete photo"
              >
                {deleting === photo.key ? "…" : "×"}
              </span>
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={items}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </>
  );
}
