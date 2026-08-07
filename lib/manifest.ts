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
    const entries: Omit<Photo, "url">[] = JSON.parse(body);
    return entries
      .map((e) => ({ ...e, url: publicUrlFor(e.key) }))
      .sort(
        (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
      );
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

export async function addToManifest(entry: Omit<Photo, "url">) {
  const current = await getManifest();
  const stripped = current.map(({ url, ...rest }) => rest);
  stripped.push(entry);
  await putManifest(stripped);
}

export async function removeFromManifest(key: string) {
  const current = await getManifest();
  const stripped = current
    .filter((p) => p.key !== key)
    .map(({ url, ...rest }) => rest);
  await putManifest(stripped);
}
