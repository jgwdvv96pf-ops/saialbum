import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono, Permanent_Marker } from "next/font/google";
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

const hand = Permanent_Marker({
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
        <footer className="border-t border-line py-6 text-center">
          <p className="font-display text-sm italic text-fog">
            to love is to be loved
          </p>
        </footer>
      </body>
    </html>
  );
}
