import { getValidAccessToken, API_BASE } from "@/lib/drive/tokens";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  isVideo: boolean;
  hasThumbnail: boolean;
};

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

  const metaRes = await fetch(`${API_BASE}/files/${fileId}?fields=thumbnailLink`, {
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
