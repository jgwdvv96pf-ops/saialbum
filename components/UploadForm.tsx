"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  file: File;
  status: "queued" | "compressing" | "uploading" | "done" | "error";
  error?: string;
};

const RAW_EXTENSIONS = [
  "dng",
  "raw",
  "arw",
  "cr2",
  "cr3",
  "nef",
  "orf",
  "rw2",
];

// R2 handles big files fine, but downscaling still keeps things fast
// to upload and view. Cameras like the GR IV shoot big JPEGs, so we
// downscale + re-compress in the browser first — well past what's
// needed for a web gallery, and the originals on your camera/card are
// never touched.
const MAX_DIMENSION = 2600;
const JPEG_QUALITY = 0.85;

async function processImage(
  file: File
): Promise<{ file: File; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  const original = { width: bitmap.width, height: bitmap.height };
  const needsResize =
    file.size > 8 * 1024 * 1024 ||
    original.width > MAX_DIMENSION ||
    original.height > MAX_DIMENSION;

  if (!needsResize) {
    bitmap.close();
    return { file, ...original };
  }

  let { width, height } = original;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, ...original };
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) return { file, ...original };

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return {
    file: new File([blob], newName, { type: "image/jpeg" }),
    width,
    height,
  };
}

export default function UploadForm() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const incoming = Array.from(files);
    const newItems: Item[] = incoming
      .filter((f) => f.type.startsWith("image/") || RAW_EXTENSIONS.some(
        (ext) => f.name.toLowerCase().endsWith(`.${ext}`)
      ))
      .map((file) => {
        const isRaw = RAW_EXTENSIONS.some((ext) =>
          file.name.toLowerCase().endsWith(`.${ext}`)
        );
        return isRaw
          ? {
              file,
              status: "error" as const,
              error:
                "RAW files can't be read in the browser — export as JPEG (on the camera or in Lightroom/Capture One) and upload that instead.",
            }
          : { file, status: "queued" as const };
      });

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  async function uploadOne(item: Item, i: number) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, status: "compressing" } : it))
    );

    try {
      const { file: fileToUpload, width, height } = await processImage(
        item.file
      );

      setItems((prev) =>
        prev.map((it, idx) =>
          idx === i ? { ...it, status: "uploading", file: fileToUpload } : it
        )
      );

      const signRes = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: fileToUpload.type }),
      });
      if (!signRes.ok) {
        const body = await signRes.json().catch(() => null);
        throw new Error(body?.error || `sign request failed (${signRes.status})`);
      }
      const { uploadUrl, key } = await signRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": fileToUpload.type },
        body: fileToUpload,
      });
      if (!uploadRes.ok) {
        throw new Error(`upload failed (${uploadRes.status})`);
      }

      const manifestRes = await fetch("/api/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, width, height }),
      });
      if (!manifestRes.ok) {
        throw new Error("uploaded, but failed to save to the album");
      }

      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: "done" } : it))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "upload failed";
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === i ? { ...it, status: "error", error: message } : it
        )
      );
    }
  }

  async function handleUploadAll() {
    const toUpload = items
      .map((item, i) => ({ item, i }))
      .filter(
        ({ item }) =>
          (item.status === "queued" || item.status === "error") &&
          !item.error?.startsWith("RAW files")
      );

    for (const { item, i } of toUpload) {
      await uploadOne(item, i);
    }
    router.refresh();
  }

  const hasQueued = items.some(
    (i) =>
      (i.status === "queued" || i.status === "error") &&
      !i.error?.startsWith("RAW files")
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed py-16 text-center transition ${
          dragging ? "border-ink bg-line/40" : "border-line"
        }`}
      >
        <p className="font-display text-lg italic text-fog">
          drop photos here
        </p>
        <p className="font-mono text-xs text-fog">or click to choose files</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {items.map((item, i) => (
            <li
              key={`${item.file.name}-${i}`}
              className="flex flex-col gap-1 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="truncate pr-4 font-mono text-xs text-ink">
                  {item.file.name}{" "}
                  <span className="text-fog">
                    ({(item.file.size / (1024 * 1024)).toFixed(1)}MB)
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-fog">
                  {item.status === "queued" && "queued"}
                  {item.status === "compressing" && "compressing…"}
                  {item.status === "uploading" && "uploading…"}
                  {item.status === "done" && "done"}
                  {item.status === "error" &&
                    (item.error?.startsWith("RAW files")
                      ? "unsupported"
                      : "failed — retry")}
                </span>
              </div>
              {item.status === "error" && item.error && (
                <span className="font-mono text-[11px] text-red-700">
                  {item.error}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <button
          onClick={handleUploadAll}
          disabled={!hasQueued}
          className="self-start font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
        >
          {hasQueued ? "upload all" : "all uploaded"}
        </button>
      )}
    </div>
  );
}
