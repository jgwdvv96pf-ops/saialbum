import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

// Reverse-geocodes GPS coords pulled from a photo's EXIF into a short
// place name, e.g. "London, UK". Uses OSM Nominatim's free API — no
// key needed, but it does require a descriptive User-Agent and asks
// that you don't hammer it, which is a non-issue for personal uploads.
export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { "User-Agent": "saialbum-personal-album (contact via saiaj.in)" } }
    );
    if (!res.ok) return NextResponse.json({ location: null });

    const data = await res.json();
    const a = data.address || {};
    const place = a.city || a.town || a.village || a.suburb || a.county;
    const country = a.country;
    const location = [place, country].filter(Boolean).join(", ");

    return NextResponse.json({ location: location || null });
  } catch {
    return NextResponse.json({ location: null });
  }
}
