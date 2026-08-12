import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { r2, BUCKET, publicUrlFor } from "@/lib/r2";

const MANIFEST_KEY = "manifest.json";

export type Photo = {
  key: string;
  url: string;
  width: number;
  height: number;
  takenAt: string;
  location?: string;
  caption?: string;
  album?: string;
  order: number;
};

async function streamToString(stream: any): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function getManifest(): Promise<Photo[]> {
  try {
    const res = await r2.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: MANIFEST_KEY })
    );
    const body = await streamToString(res.Body);
    const entries: (Omit<Photo, "url"> & { order?: number })[] =
      JSON.parse(body);

    // Legacy manifests won't have an `order` field yet — backfill it
    // from the old newest-first (by takenAt) ordering so nothing jumps
    // around the first time this runs.
    let normalized = entries;
    if (entries.some((e) => e.order === undefined)) {
      const byTaken = [...entries].sort(
        (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
      );
      normalized = entries.map((e) => ({
        ...e,
        order: e.order ?? byTaken.findIndex((s) => s.key === e.key),
      }));
    }

    return (normalized as Omit<Photo, "url">[])
      .map((e) => ({ ...e, url: publicUrlFor(e.key) }))
      .sort((a, b) => a.order - b.order);
  } catch (err: any) {
    // First upload ever — manifest doesn't exist yet.
    if (err.name === "NoSuchKey") return [];
    throw err;
  }
}

async function putManifest(entries: Omit<Photo, "url">[]) {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: MANIFEST_KEY,
      Body: JSON.stringify(entries),
      ContentType: "application/json",
    })
  );
}

export async function getPhotoByKey(key: string): Promise<Photo | null> {
  const photos = await getManifest();
  return photos.find((p) => p.key === key) || null;
}

export async function addToManifest(
  entry: Omit<Photo, "url" | "order" | "album"> & { album?: string }
) {
  const current = await getManifest();
  const stripped = current.map(({ url, ...rest }) => rest);
  // New photos go to the front — lower order number sorts first.
  const minOrder = stripped.length
    ? Math.min(...stripped.map((p) => p.order))
    : 0;
  stripped.push({ ...entry, order: minOrder - 1 });
  await putManifest(stripped);
}

export async function removeFromManifest(key: string) {
  const current = await getManifest();
  const stripped = current
    .filter((p) => p.key !== key)
    .map(({ url, ...rest }) => rest);
  await putManifest(stripped);
}

// Persists a full reorder. `keys` should be every photo key, in the
// new desired display order.
export async function reorderManifest(keys: string[]) {
  const current = await getManifest();
  const stripped = current.map(({ url, ...rest }) => rest);
  const byKey = new Map(stripped.map((p) => [p.key, p]));

  const reordered: Omit<Photo, "url">[] = [];
  keys.forEach((key, i) => {
    const p = byKey.get(key);
    if (p) {
      reordered.push({ ...p, order: i });
      byKey.delete(key);
    }
  });
  // Anything not included (shouldn't normally happen) keeps going, appended.
  let next = reordered.length;
  for (const p of byKey.values()) {
    reordered.push({ ...p, order: next++ });
  }

  await putManifest(reordered);
}

const EDITABLE_FIELDS = ["location", "caption", "album"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function updatePhotoField(
  key: string,
  field: EditableField,
  value: string
) {
  const current = await getManifest();
  const stripped = current.map(({ url, ...rest }) => rest);
  const updated = stripped.map((p) =>
    p.key === key ? { ...p, [field]: value } : p
  );
  await putManifest(updated);
}

export function isEditableField(field: string): field is EditableField {
  return (EDITABLE_FIELDS as readonly string[]).includes(field);
}

// Every distinct album name currently in use, in first-seen order.
export async function listAlbums(): Promise<string[]> {
  const current = await getManifest();
  const seen = new Set<string>();
  for (const p of current) {
    if (p.album) seen.add(p.album);
  }
  return [...seen].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}
