import { cookies } from "next/headers";

export const AUTH_COOKIE = "album_auth";

/**
 * Deliberately simple: this is a single-user personal album, not a
 * multi-tenant app. The cookie holds the passcode itself, set as
 * httpOnly + secure + sameSite=strict so it never touches client JS
 * and never leaves the browser except to this site. Good enough to
 * keep strangers from uploading to your Cloudinary account; not a
 * substitute for real auth if you ever open this up to other people.
 */
export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const cookie = store.get(AUTH_COOKIE);
  return !!cookie?.value && cookie.value === process.env.ALBUM_PASSCODE;
}
