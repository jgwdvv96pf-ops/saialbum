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
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 sm:flex-row"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-20 font-mono text-sm text-white/70 transition hover:text-white sm:right-8 sm:top-8"
        aria-label="Close"
      >
        close ×
      </button>

      {/* image side */}
      <div
        className="relative flex flex-1 items-center justify-center p-4 pt-14 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="absolute left-2 font-mono text-2xl text-white/50 transition hover:text-white sm:left-6"
          aria-label="Previous photo"
        >
          ‹
        </button>

        <Image
          src={photo.url}
          alt=""
          width={photo.width}
          height={photo.height}
          className="max-h-[60vh] w-auto max-w-full rounded-sm object-contain sm:max-h-[85vh]"
          priority
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="absolute right-2 font-mono text-2xl text-white/50 transition hover:text-white sm:right-6"
          aria-label="Next photo"
        >
          ›
        </button>
      </div>

      {/* caption panel */}
      <div
        className="w-full shrink-0 border-t border-white/10 p-4 sm:w-72 sm:overflow-y-auto sm:border-l sm:border-t-0 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
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
            className="mt-3 w-full resize-none rounded-sm bg-white/5 px-2 py-2 font-mono text-sm text-white outline-none placeholder:text-white/40"
          />
        ) : (
          <p
            role={authed ? "button" : undefined}
            onClick={() => authed && setEditing(true)}
            className={`mt-3 whitespace-pre-wrap font-mono text-sm ${
              photo.caption ? "text-white/90" : "text-white/40"
            } ${authed ? "cursor-pointer hover:text-white" : ""}`}
          >
            {photo.caption || (authed ? "add a caption" : "")}
          </p>
        )}
      </div>
    </div>
  );
}
