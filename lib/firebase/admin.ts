import "server-only";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// FIREBASE_SERVICE_ACCOUNT_KEY is the service account JSON, base64
// encoded — base64 avoids newline-escaping headaches when pasting a
// private key into Vercel's env var UI. Decode it once at startup.
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }
  const json = Buffer.from(raw, "base64").toString("utf-8");
  return JSON.parse(json);
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert(loadServiceAccount()) });

export const adminAuth = getAuth(app);
