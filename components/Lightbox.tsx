"use client";

import { useEffect, useCallback, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/manifest";

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
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing) {
        if (e.key === "Escape") setEditing(false);
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
  }, [onClose, next, prev, editing]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 sm:p-10"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-20 font-mono text-sm text-white/70 transition hover:text-white sm:right-8 sm:top-8"
        aria-label="Close"
      >
        close ×
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        className="absolute left-2 z-20 font-mono text-2xl text-white/50 transition hover:text-white sm:left-6"
        aria-label="Previous photo"
      >
        ‹
      </button>

      {/* image + caption, grouped and centered as one block */}
      <div
        className="flex max-h-full max-w-full flex-col items-stretch sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photo.url}
          alt=""
          width={photo.width}
          height={photo.height}
          className="max-h-[60vh] w-auto min-w-0 max-w-full rounded-t-sm object-contain sm:max-h-[85vh] sm:rounded-l-sm sm:rounded-tr-none"
          priority
        />

        <div className="flex w-full flex-col bg-black/40 p-4 sm:w-64 sm:shrink-0 sm:overflow-y-auto sm:rounded-r-sm sm:p-5">
          <p className="font-mono text-xs text-white/50">
            {(index + 1).toString().padStart(2, "0")}/
            {photos.length.toString().padStart(2, "0")}
            {photo.location ? ` · ${photo.location}` : ""}
          </p>

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
              className="mt-3 w-full resize-none rounded-sm bg-white/5 px-2 py-2 font-hand text-xl leading-tight text-white outline-none placeholder:text-white/40"
            />
          ) : (
            <p
              role={authed ? "button" : undefined}
              onClick={() => authed && setEditing(true)}
              className={`mt-3 whitespace-pre-wrap font-hand text-xl leading-tight ${
                photo.caption ? "text-white/90" : "text-white/40"
              } ${authed ? "cursor-pointer hover:text-white" : ""}`}
            >
              {photo.caption || (authed ? "add a caption" : "")}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        className="absolute right-2 z-20 font-mono text-2xl text-white/50 transition hover:text-white sm:right-6"
        aria-label="Next photo"
      >
        ›
      </button>
    </div>
  );
}
