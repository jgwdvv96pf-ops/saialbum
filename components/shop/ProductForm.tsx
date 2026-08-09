"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductWithUrls } from "@/lib/shop";

// Same downscale/compress approach as the photo album's UploadForm —
// keeps product photos fast to load without touching originals.
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

async function processImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let { width, height } = bitmap;

  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size < 4 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

export default function ProductForm({
  existing,
}: {
  existing?: ProductWithUrls;
}) {
  const router = useRouter();
  const isEdit = !!existing;

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [keptImages, setKeptImages] = useState<string[]>(existing?.images || []);
  const [title, setTitle] = useState(existing?.title || "");
  const [price, setPrice] = useState(existing?.price?.toString() || "");
  const [size, setSize] = useState(existing?.size || "");
  const [condition, setCondition] = useState(existing?.condition || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function removeExisting(key: string) {
    setKeptImages((prev) => prev.filter((k) => k !== key));
  }

  function removeNew(i: number) {
    setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (keptImages.length + newFiles.length === 0) {
        throw new Error("Add at least one photo");
      }
      if (!title.trim() || !price) {
        throw new Error("Title and price are required");
      }

      // Upload any newly-added images.
      const uploadedKeys: string[] = [];
      for (const file of newFiles) {
        const compressed = await processImage(file);
        const signRes = await fetch("/api/shop/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: compressed.type }),
        });
        if (!signRes.ok) throw new Error("Failed to sign upload");
        const { uploadUrl, key } = await signRes.json();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": compressed.type },
          body: compressed,
        });
        if (!putRes.ok) throw new Error("Upload failed");
        uploadedKeys.push(key);
      }

      const images = [...keptImages, ...uploadedKeys];
      const payload = {
        title: title.trim(),
        price: Number(price),
        size: size.trim() || undefined,
        condition: condition.trim() || undefined,
        description: description.trim() || undefined,
      };

      if (isEdit && existing) {
        const res = await fetch("/api/shop/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: existing.id, ...payload, images }),
        });
        if (!res.ok) throw new Error("Failed to save changes");
      } else {
        const res = await fetch("/api/shop/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: crypto.randomUUID(), images, ...payload }),
        });
        if (!res.ok) throw new Error("Failed to create listing");
      }

      router.push("/shop");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <div>
        <label className="mb-1 block font-mono text-xs text-fog">photos</label>
        <div className="flex flex-wrap gap-2">
          {isEdit &&
            existing!.images.map((key, i) =>
              keptImages.includes(key) ? (
                <div key={key} className="relative h-20 w-20 overflow-hidden rounded-sm bg-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={existing!.imageUrls[i]} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExisting(key)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ) : null
            )}
          {newFiles.map((file, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-sm bg-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeNew(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center rounded-sm border border-dashed border-line font-mono text-xs text-fog hover:border-ink hover:text-ink"
          >
            +
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) =>
              setNewFiles((prev) => [...prev, ...Array.from(e.target.files || [])])
            }
          />
        </div>
      </div>

      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="title"
        className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
      />
      <div className="flex gap-4">
        <input
          required
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="price"
          className="w-32 border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="size (optional)"
          className="flex-1 border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
        />
      </div>
      <input
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
        placeholder="condition (e.g. like new, worn a few times)"
        className="border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="description (optional)"
        rows={4}
        className="resize-none border-b border-line bg-transparent py-2 font-mono text-sm outline-none placeholder:text-fog focus:border-ink"
      />

      {error && <p className="font-mono text-xs text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink disabled:opacity-40"
      >
        {submitting ? "saving…" : isEdit ? "save changes" : "list item"}
      </button>
    </form>
  );
}
