"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/manifest";

export default function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const photo = photos[index];

  const next = useCallback(
    () => onNavigate((index + 1) % photos.length),
    [index, photos.length, onNavigate]
  );
  const prev = useCallback(
    () => onNavigate((index - 1 + photos.length) % photos.length),
    [index, photos.length, onNavigate]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
  }, [onClose, next, prev]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 sm:p-10"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 font-mono text-sm text-white/70 transition hover:text-white sm:right-8 sm:top-8"
        aria-label="Close"
      >
        close ×
      </button>

      <span className="absolute left-4 top-4 font-mono text-xs text-white/50 sm:left-8 sm:top-8">
        {(index + 1).toString().padStart(2, "0")} /{" "}
        {photos.length.toString().padStart(2, "0")}
        {photo.location ? ` · ${photo.location}` : ""}
      </span>

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

      <div
        className="relative max-h-full max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photo.url}
          alt=""
          width={photo.width}
          height={photo.height}
          className="max-h-[85vh] w-auto max-w-full rounded-sm object-contain"
          priority
        />
      </div>

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
  );
}
