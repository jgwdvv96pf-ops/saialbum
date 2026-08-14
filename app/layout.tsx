import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Self-hosted fonts instead of next/font/google — the Google Fonts
// CSS endpoint occasionally fails to respond in a way next/font can
// parse during Vercel's build (a systemic fetch issue, not a config
// problem — it failed identically for every font at once). Fontsource
// bundles the actual font files into the build, so there's no
// network dependency at build time at all.
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/fraunces/500-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/reenie-beanie/400.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "album",
  description: "a personal photo album",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-paper text-ink font-body antialiased">
        <div className="flex-1">{children}</div>
        <footer className="relative border-t border-line py-6 text-center">
          <a
            href="/shop"
            aria-label="shop"
            className="absolute bottom-6 left-6 font-mono text-sm text-fog transition hover:text-ink"
          >
            !
          </a>
          <p className="font-display text-sm italic text-fog">
            to love is to be loved
          </p>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
