import { getJson, putJson } from "@/lib/r2";

const TOKEN_KEY = "drive-tokens.json";

// Unlike Zoho, Google's OAuth endpoints are fixed — no regional
// datacenter complexity here.
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/drive/v3";

// drive.readonly is required to read a pre-existing folder's
// contents by folder ID directly. The narrower drive.file scope
// avoids Google's "restricted scope" verification requirements, but
// only grants access to files the app itself creates or that the
// user explicitly opens via Google's file picker — it can't read an
// existing folder freely, which is what's needed here.
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

type StoredTokens = {
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: number; // epoch ms
};

export async function getStoredTokens(): Promise<StoredTokens | null> {
  return getJson<StoredTokens | null>(TOKEN_KEY, null);
}

async function storeTokens(tokens: StoredTokens) {
  await putJson(TOKEN_KEY, tokens);
}

export function buildAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI as string,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // required for a refresh_token, not just a short-lived access token
    prompt: "consent",
  });
  return `${AUTH_URL}?${params}`;
}

export async function completeAuthorization(code: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI as string,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token exchange failed: ${body}`);
  }
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Google token exchange returned no access_token: ${JSON.stringify(data)}`);
  }
  if (!data.refresh_token) {
    // Google only issues a refresh_token on the FIRST consent, or
    // when prompt=consent forces re-consent — if this ever fires,
    // the fix is revoking the app's access in the Google Account's
    // "Third-party apps" settings and reconnecting from scratch.
    throw new Error(
      "Google didn't return a refresh_token — revoke this app's access at myaccount.google.com/permissions and reconnect"
    );
  }

  await storeTokens({
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    accessTokenExpiresAt: Date.now() + data.expires_in * 1000,
  });
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    throw new Error("Google Drive isn't connected yet — visit /drive/connect");
  }

  const isExpired = !tokens.accessTokenExpiresAt || tokens.accessTokenExpiresAt < Date.now() + 60_000;
  if (!isExpired && tokens.accessToken) {
    return tokens.accessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: tokens.refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token refresh failed: ${body}`);
  }
  const data = await res.json();

  await storeTokens({
    ...tokens,
    accessToken: data.access_token,
    accessTokenExpiresAt: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
}

export { API_BASE };
