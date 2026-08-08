import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

export const BUCKET = process.env.R2_BUCKET_NAME as string;

// R2's S3-compatible endpoint is account-scoped, not bucket-scoped.
// "auto" region is what Cloudflare's docs specify for R2 regardless
// of where the bucket actually lives.
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});

export function publicUrlFor(key: string) {
  const base = (process.env.R2_PUBLIC_URL as string).replace(/\/$/, "");
  return `${base}/${key}`;
}

async function streamToString(stream: any): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// Small generic JSON blob store on top of R2 — used for the shop's
// product and order manifests, same idea as the photo manifest but
// without needing photo-specific fields baked in.
export async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await streamToString(res.Body);
    return JSON.parse(body) as T;
  } catch (err: any) {
    if (err.name === "NoSuchKey") return fallback;
    throw err;
  }
}

export async function putJson<T>(key: string, value: T) {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(value),
      ContentType: "application/json",
    })
  );
}
