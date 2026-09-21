"use client";

import { useEffect, useState } from "react";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  isVideo: boolean;
  hasThumbnail: boolean;
};

export default function DriveGallery() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/drive/files")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setFiles(data.files);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-14 text-center">
        <p className="font-mono text-xs text-fog">loading…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="max-w-sm font-mono text-xs text-red-700">{error}</p>
        {error.includes("connect") && (
          <a href="/drive/connect" className="mt-4 inline-block font-mono text-xs text-ink underline">
            go to /drive/connect
          </a>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
      <h1 className="mb-8 font-display text-3xl italic">drive</h1>

      {files.length === 0 ? (
        <p className="font-mono text-xs text-fog">nothing in this folder yet</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {files.map((f) => (
            <a
              key={f.id}
              href={`https://drive.google.com/file/d/${f.id}/view`}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-sm bg-line"
            >
              {f.hasThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/drive/thumbnail/${f.id}`}
                  alt={f.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-fog">
                  no preview
                </div>
              )}
              {f.isVideo && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-paper">
                    ▶
                  </span>
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
