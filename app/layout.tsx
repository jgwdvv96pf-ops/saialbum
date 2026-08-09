import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono, Reenie_Beanie } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const hand = Reenie_Beanie({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-hand",
});

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
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} ${hand.variable} flex min-h-screen flex-col bg-paper text-ink font-body antialiased`}
      >
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
      </body>
    </html>
  );
}
