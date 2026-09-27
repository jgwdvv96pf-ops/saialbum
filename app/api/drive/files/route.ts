import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listFolderFiles, diagnoseFolder } from "@/lib/drive/google";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await listFolderFiles();

    // Only run the (more expensive, multi-call) diagnostic when
    // there's actually nothing to explain — a normal non-empty
    // result skips straight past this.
    if (files.length === 0) {
      const diagnostic = await diagnoseFolder();
      if (!diagnostic.ok) {
        const messages: Record<string, string> = {
          not_found_or_no_access:
            "That folder ID isn't visible to the connected account — check GOOGLE_DRIVE_FOLDER_ID, or that you authorized the same Google account that owns/has access to this folder.",
          not_a_folder: "GOOGLE_DRIVE_FOLDER_ID points at a file, not a folder — check you copied the folder's ID, not a file inside it.",
          empty_folder: "This folder is genuinely empty — nothing's been added to it yet.",
          no_matching_file_types:
            `This folder has ${"totalItems" in diagnostic ? diagnostic.totalItems : "some"} item(s), but none are images or videos — only image/* and video/* files show up here.`,
        };
        return NextResponse.json({ files: [], diagnostic: messages[diagnostic.reason] });
      }
    }

    return NextResponse.json({ files });
  } catch (err) {
    console.error("[drive files error]", err);
    const message = err instanceof Error ? err.message : "Failed to load Drive files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
