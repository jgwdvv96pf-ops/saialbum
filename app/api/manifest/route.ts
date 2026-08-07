import { NextRequest, NextResponse } from "next/server";
import { addToManifest, updateLocation } from "@/lib/manifest";
import { isAuthed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, width, height } = await req.json();
  if (!key || !width || !height) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await addToManifest({
    key,
    width,
    height,
    takenAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, location } = await req.json();
  if (!key || typeof location !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await updateLocation(key, location.slice(0, 120));

  return NextResponse.json({ ok: true });
}
