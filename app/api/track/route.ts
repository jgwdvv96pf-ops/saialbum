import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { recordPageView } from "@/lib/analytics/track";

const VISITOR_COOKIE = "av_id";

function getClientIp(req: NextRequest): string | null {
  // Vercel's edge network sets x-forwarded-for; first entry is the
  // actual client IP, the rest are proxies it passed through.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  try {
    const { path, referrer } = await req.json();
    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const store = await cookies();
    let visitorId = store.get(VISITOR_COOKIE)?.value;
    const isNewVisitor = !visitorId;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    const country = req.headers.get("x-vercel-ip-country");
    const cityRaw = req.headers.get("x-vercel-ip-city");
    const city = cityRaw ? decodeURIComponent(cityRaw) : null;

    await recordPageView({
      visitorId,
      ip: getClientIp(req),
      path: String(path).slice(0, 500),
      referrer: referrer ? String(referrer).slice(0, 500) : null,
      userAgent: req.headers.get("user-agent"),
      country,
      city,
    });

    const res = NextResponse.json({ ok: true });
    if (isNewVisitor) {
      res.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (err) {
    // Never let analytics failures show up to the visitor — just log
    // server-side and return ok so nothing on the page reacts to it.
    console.error("[track error]", err);
    return NextResponse.json({ ok: false });
  }
}
