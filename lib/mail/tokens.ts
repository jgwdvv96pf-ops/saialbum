import { getJson, putJson } from "@/lib/r2";

const TOKEN_KEY = "mail-tokens.json";

// Zoho has multiple regional data centers — the account's tokens are
// only valid against ITS region's endpoints. Default is the US
// (.com) accounts domain; override if your Zoho account is in a
// different data center (e.g. https://accounts.zoho.eu, .in, .com.au, .jp).
const ACCOUNTS_BASE_URL = process.env.ZOHO_ACCOUNTS_BASE_URL || "https://accounts.zoho.com";

type StoredTokens = {
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: number; // epoch ms
  apiDomain: string; // e.g. https://mail.zoho.com — returned by Zoho, region-correct
  accountId: string; // Zoho Mail account id, needed for nearly every API call
};

export async function getStoredTokens(): Promise<StoredTokens | null> {
  return getJson<StoredTokens | null>(TOKEN_KEY, null);
}

async function storeTokens(tokens: StoredTokens) {
  await putJson(TOKEN_KEY, tokens);
}

// Step 1 of the one-time connect flow — builds the URL Sai visits to
// authorize this app against their Zoho Mail account.
export function buildAuthorizeUrl(): string {
  const params = new URLSearchParams({
    scope: "ZohoMail.messages.ALL,ZohoMail.folders.READ,ZohoMail.accounts.READ",
    client_id: process.env.ZOHO_CLIENT_ID as string,
    response_type: "code",
    access_type: "offline", // required to get a refresh_token, not just a short-lived access token
    redirect_uri: process.env.ZOHO_REDIRECT_URI as string,
    prompt: "consent",
  });
  return `${ACCOUNTS_BASE_URL}/oauth/v2/auth?${params}`;
}

// Step 2 — exchanges the ?code=... Zoho redirected back with for a
// refresh token, then looks up the Zoho Mail accountId needed for
// every subsequent API call, and stores everything.
export async function completeAuthorization(code: string): Promise<void> {
  const tokenRes = await fetch(`${ACCOUNTS_BASE_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.ZOHO_CLIENT_ID as string,
      client_secret: process.env.ZOHO_CLIENT_SECRET as string,
      redirect_uri: process.env.ZOHO_REDIRECT_URI as string,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Zoho token exchange failed: ${body}`);
  }
  const tokenData = await tokenRes.json();
  // api_domain is region-correct — e.g. https://mail.zoho.com or https://mail.zoho.eu
  const apiDomain: string = tokenData.api_domain;

  const accountsRes = await fetch(`${apiDomain}/api/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${tokenData.access_token}` },
  });
  if (!accountsRes.ok) {
    const body = await accountsRes.text();
    throw new Error(`Failed to fetch Zoho Mail account: ${body}`);
  }
  const accountsData = await accountsRes.json();
  const accountId = accountsData?.data?.[0]?.accountId;
  if (!accountId) {
    throw new Error("No Zoho Mail account found on this token");
  }

  await storeTokens({
    refreshToken: tokenData.refresh_token,
    accessToken: tokenData.access_token,
    accessTokenExpiresAt: Date.now() + tokenData.expires_in * 1000,
    apiDomain,
    accountId: String(accountId),
  });
}

// Returns a valid access token, refreshing it first if it's expired
// or about to be (60s buffer). Every mail API call should go through
// this rather than reading the stored token directly.
export async function getValidAccessToken(): Promise<{ accessToken: string; apiDomain: string; accountId: string }> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    throw new Error("Zoho Mail isn't connected yet — visit /mail/connect");
  }

  const isExpired = !tokens.accessTokenExpiresAt || tokens.accessTokenExpiresAt < Date.now() + 60_000;
  if (!isExpired && tokens.accessToken) {
    return { accessToken: tokens.accessToken, apiDomain: tokens.apiDomain, accountId: tokens.accountId };
  }

  const res = await fetch(`${ACCOUNTS_BASE_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: tokens.refreshToken,
      client_id: process.env.ZOHO_CLIENT_ID as string,
      client_secret: process.env.ZOHO_CLIENT_SECRET as string,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoho token refresh failed: ${body}`);
  }
  const data = await res.json();

  const updated: StoredTokens = {
    ...tokens,
    accessToken: data.access_token,
    accessTokenExpiresAt: Date.now() + data.expires_in * 1000,
  };
  await storeTokens(updated);

  return { accessToken: updated.accessToken!, apiDomain: updated.apiDomain, accountId: updated.accountId };
}
