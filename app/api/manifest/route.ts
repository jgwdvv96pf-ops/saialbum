import { NextRequest, NextResponse } from "next/server";
import { addToManifest, isEditableField, updatePhotoField } from "@/lib/manifest";
import { isAuthed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, width, height, takenAt, album } = await req.json();
  if (!key || !width || !height) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await addToManifest({
    key,
    width,
    height,
    // Prefer EXIF capture time from the client if we got one, else now.
    takenAt: takenAt || new Date().toISOString(),
    ...(album ? { album: String(album).slice(0, 60) } : {}),
  });

  return NextResponse.json({ ok: true });
}

// Generic field patch — used for location, caption, and album edits.
export async function PATCH(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { key } = body;
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  // Accept exactly one editable field per request, whichever is present.
  const field = ["location", "caption", "album"].find(
    (f) => typeof body[f] === "string"
  );
  if (!field || !isEditableField(field)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const maxLen = field === "caption" ? 500 : 120;
  await updatePhotoField(key, field, body[field].slice(0, maxLen));

  return NextResponse.json({ ok: true });
}
