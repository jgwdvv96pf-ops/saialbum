import { NextRequest, NextResponse } from "next/server";
import { addNote, deleteNote, getNotesForPhoto } from "@/lib/notes";
import { getPhotoByKey } from "@/lib/manifest";
import { isAuthed } from "@/lib/auth";
import { notifyNewNote } from "@/lib/discord-notes";

export async function GET(req: NextRequest) {
  const photoKey = req.nextUrl.searchParams.get("photoKey");
  if (!photoKey) {
    return NextResponse.json({ error: "Missing photoKey" }, { status: 400 });
  }
  const notes = await getNotesForPhoto(photoKey);
  return NextResponse.json({ notes });
}

// Deliberately public — anyone viewing the album can leave a note,
// no passcode needed. Length caps are enforced in lib/notes.ts too.
export async function POST(req: NextRequest) {
  const { photoKey, author, text } = await req.json();

  if (!photoKey || !author?.trim() || !text?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const note = await addNote(photoKey, author.trim(), text.trim());

  const photo = await getPhotoByKey(photoKey);
  if (photo) {
    await notifyNewNote(note, photo);
  }

  return NextResponse.json({ ok: true, note });
}

// Moderation only — deleting a spammy/inappropriate note requires the passcode.
export async function DELETE(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deleteNote(id);
  return NextResponse.json({ ok: true });
}
