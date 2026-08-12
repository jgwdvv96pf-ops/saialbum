import type { Note } from "@/lib/notes";
import type { Photo } from "@/lib/manifest";

const API = "https://discord.com/api/v10";

// Falls back to the shop's channel if a dedicated one isn't set —
// same bot either way, just pick DISCORD_NOTES_CHANNEL_ID if you'd
// rather keep notes separate from order notifications.
export async function notifyNewNote(note: Note, photo: Photo): Promise<void> {
  const channelId = process.env.DISCORD_NOTES_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) return;

  const payload = {
    embeds: [
      {
        title: "New note left on a photo",
        color: 0x8b8a85,
        thumbnail: { url: photo.url },
        fields: [
          { name: "From", value: note.author, inline: true },
          ...(photo.location ? [{ name: "Photo", value: photo.location, inline: true }] : []),
          { name: "Note", value: note.text },
        ],
        footer: { text: "saiaj.in" },
        timestamp: note.createdAt,
      },
    ],
  };

  try {
    await fetch(`${API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort — never block a note from posting on Discord failing
  }
}
