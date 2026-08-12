import { getJson, putJson } from "@/lib/r2";

const NOTES_KEY = "notes-manifest.json";

export type Note = {
  id: string;
  photoKey: string;
  author: string;
  text: string;
  createdAt: string;
};

export async function getNotesForPhoto(photoKey: string): Promise<Note[]> {
  const all = await getJson<Note[]>(NOTES_KEY, []);
  return all
    .filter((n) => n.photoKey === photoKey)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Open to anyone — no auth. Caps are enforced here too, not just in
// the API route, so this stays safe even if called from elsewhere.
export async function addNote(
  photoKey: string,
  author: string,
  text: string
): Promise<Note> {
  const all = await getJson<Note[]>(NOTES_KEY, []);
  const note: Note = {
    id: crypto.randomUUID().slice(0, 8),
    photoKey,
    author: author.slice(0, 40),
    text: text.slice(0, 300),
    createdAt: new Date().toISOString(),
  };
  all.push(note);
  await putJson(NOTES_KEY, all);
  return note;
}

// Moderation — admin (passcode) only, wired up in the API route.
export async function deleteNote(id: string): Promise<void> {
  const all = await getJson<Note[]>(NOTES_KEY, []);
  const remaining = all.filter((n) => n.id !== id);
  await putJson(NOTES_KEY, remaining);
}
