"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Don't track your own admin/personal surfaces — no value in
// polluting the analytics with your own visits, and some of this is
// genuinely private (mail, upload).
const EXCLUDED_PREFIXES = [
  "/upload",
  "/shop/upload",
  "/shop/admin",
  "/earn/admin",
  "/mail",
  "/login",
  "/admin",
];

export default function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => {
      // best-effort — a failed tracking call should never affect the page
    });
  }, [pathname]);

  return null;
}
