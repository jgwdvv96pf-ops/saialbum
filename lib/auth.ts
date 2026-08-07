import { cookies } from "next/headers";

export const AUTH_COOKIE = "album_auth";

/**
 * ALBUM_PASSCODES is a comma-separated list, e.g. "mine123,friend456".
 * Falls back to the old singular ALBUM_PASSCODE env var too, so
 * existing deployments don't break.
 */
export function validPasscodes(): string[] {
  const list = process.env.ALBUM_PASSCODES || process.env.ALBUM_PASSCODE || "";
  return list
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function isValidPasscode(passcode: string): boolean {
  return validPasscodes().includes(passcode);
}

/**
 * Deliberately simple: this is a small private album, not a
 * multi-tenant app. The cookie holds the passcode itself, set as
 * httpOnly + secure + sameSite=strict so it never touches client JS
 * and never leaves the browser except to this site. Good enough to
 * keep strangers from uploading to your R2 bucket; not a substitute
 * for real auth if you ever open this up more broadly.
 */
export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const cookie = store.get(AUTH_COOKIE);
  return !!cookie?.value && isValidPasscode(cookie.value);
}
