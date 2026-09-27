import { getValidAccessToken, API_BASE } from "@/lib/drive/tokens";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  isVideo: boolean;
  hasThumbnail: boolean;
};

// Distinguishes the several different reasons a folder can come back
// "empty" — Google's API returns 200-with-zero-results identically
// whether the folder ID is wrong, the account can't see it, or it's
// genuinely empty of images/videos, so this actually checks each case
// instead of leaving all three looking the same.
export type FolderDiagnostic =
  | { ok: true }
  | { ok: false; reason: "not_found_or_no_access"; detail: string }
  | { ok: false; reason: "not_a_folder"; detail: string }
  | { ok: false; reason: "empty_folder" }
  | { ok: false; reason: "no_matching_file_types"; totalItems: number };

export async function diagnoseFolder(): Promise<FolderDiagnostic> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    return { ok: false, reason: "not_found_or_no_access", detail: "GOOGLE_DRIVE_FOLDER_ID isn't set" };
  }
  const accessToken = await getValidAccessToken();

  // Step 1: does this ID even resolve to something the connected
  // account can see?
  const metaRes = await fetch(
    `${API_BASE}/files/${folderId}?fields=id,name,mimeType&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!metaRes.ok) {
    const body = await metaRes.text();
    return {
      ok: false,
      reason: "not_found_or_no_access",
      detail: `Google returned ${metaRes.status}: ${body}`,
    };
  }
  const meta = await metaRes.json();
  if (meta.mimeType !== "application/vnd.google-apps.folder") {
    return { ok: false, reason: "not_a_folder", detail: `That ID is a "${meta.mimeType}", not a folder` };
  }

  // Step 2: does it have ANY children at all (regardless of type)?
  const allParams = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,mimeType)",
    pageSize: "50",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const allRes = await fetch(`${API_BASE}/files?${allParams}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const allData = allRes.ok ? await allRes.json() : { files: [] };
  const allFiles = allData.files || [];

  if (allFiles.length === 0) {
    return { ok: false, reason: "empty_folder" };
  }

  const hasImageOrVideo = allFiles.some(
    (f: any) => f.mimeType.startsWith("image/") || f.mimeType.startsWith("video/")
  );
  if (!hasImageOrVideo) {
    return { ok: false, reason: "no_matching_file_types", totalItems: allFiles.length };
  }

  return { ok: true };
}

// Only ever queries the one folder ID you configure — the OAuth
// scope technically grants read access to the whole Drive (Google
// doesn't offer a "single folder" scope for reading pre-existing
// files by ID), but nothing in this app ever requests anything
// outside GOOGLE_DRIVE_FOLDER_ID.
export async function listFolderFiles(): Promise<DriveFile[]> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID isn't configured");

  const accessToken = await getValidAccessToken();

  const q = `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`;
  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType,createdTime,thumbnailLink)",
    orderBy: "createdTime desc",
    pageSize: "200",
    // Without these two, Google silently returns zero results (no
    // error) for a folder that lives inside a Shared Drive rather
    // than regular "My Drive" — a genuinely easy way to see this
    // exact "nothing here" symptom with a perfectly valid folder ID.
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const res = await fetch(`${API_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive files.list failed: ${body}`);
  }
  const data = await res.json();

  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    createdTime: f.createdTime,
    isVideo: f.mimeType.startsWith("video/"),
    hasThumbnail: !!f.thumbnailLink,
  }));
}

// Proxies a file's thumbnail bytes through our own server — Drive's
// thumbnailLink is a short-lived URL that may still require the
// requester to carry the same auth as the resource owner, so this
// fetches it server-side with our token attached rather than handing
// the raw Google URL to the browser.
export async function getThumbnail(fileId: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const accessToken = await getValidAccessToken();

  const metaRes = await fetch(`${API_BASE}/files/${fileId}?fields=thumbnailLink&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) return null;
  const meta = await metaRes.json();
  if (!meta.thumbnailLink) return null;

  const thumbRes = await fetch(meta.thumbnailLink, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!thumbRes.ok) return null;

  return {
    body: await thumbRes.arrayBuffer(),
    contentType: thumbRes.headers.get("content-type") || "image/jpeg",
  };
}

export function driveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
