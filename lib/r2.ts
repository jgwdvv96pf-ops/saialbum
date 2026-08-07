import { S3Client } from "@aws-sdk/client-s3";

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
