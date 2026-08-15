import { getManifest } from "@/lib/manifest";
import { isAuthed } from "@/lib/auth";
import Gallery from "@/components/Gallery";

export const dynamic = "force-dynamic";

// Explicitly tells search engines "this page IS the entity for saia /
// saiaj.in" — the single highest-leverage thing for ranking #1 on a
// brand-name search with essentially no competition. Two @type
// entries (Person + WebSite) so it works whether someone searches the
// person's name or the domain itself.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      name: "saia",
      alternateName: ["saiajin", "saiaj.in"],
      url: "https://saiaj.in",
    },
    {
      "@type": "WebSite",
      name: "saiaj.in",
      alternateName: "saiajin",
      url: "https://saiaj.in",
    },
  ],
};

export default async function HomePage() {
  const [photos, authed] = await Promise.all([getManifest(), isAuthed()]);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10 sm:px-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="mb-10 flex items-baseline justify-between border-b border-line pb-6 sm:mb-14">
        <h1 className="font-display text-3xl italic tracking-tight sm:text-4xl">
          photos by saia
        </h1>
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-xs text-fog">
            {photos.length.toString().padStart(2, "0")} photo
            {photos.length === 1 ? "" : "s"}
          </span>
          <a
            href={authed ? "/upload" : "/login"}
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
          >
            {authed ? "upload" : "unlock"}
          </a>
        </div>
      </header>

      {photos.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <p className="font-display text-xl italic text-fog">
            nothing here yet
          </p>
          <a
            href={authed ? "/upload" : "/login"}
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
          >
            add the first one
          </a>
        </div>
      ) : (
        <Gallery photos={photos} authed={authed} />
      )}
    </main>
  );
}
