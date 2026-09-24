import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "privacy policy",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <a href="/" className="font-mono text-xs text-fog transition hover:text-ink">
        ← saiaj.in
      </a>
      <h1 className="mb-2 mt-6 font-display text-3xl italic">privacy policy</h1>
      <p className="mb-10 font-mono text-xs text-fog">last updated September 2026</p>

      <div className="flex flex-col gap-8 font-body text-sm leading-relaxed text-ink/90">
        <section>
          <h2 className="mb-2 font-display text-lg italic">what this covers</h2>
          <p>
            saiaj.in is a personal site — a photo album, a shop, a points/rewards
            game, and a few other personal projects. This page explains what
            data gets collected across those, and how it's used. It's not a
            corporate privacy policy for a company processing your data at
            scale — it's an honest account of what a small personal site
            actually does.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">what's collected</h2>
          <ul className="flex flex-col gap-2">
            <li>
              <strong className="font-mono text-xs uppercase text-fog">visiting the site</strong>
              <br />
              Basic analytics on page visits — IP address, approximate location
              (country/city), the page you viewed, the referring page, and your
              browser's user agent. A cookie is set to recognize repeat visits.
              This is used to understand traffic and improve the site — not
              sold or shared with advertisers.
            </li>
            <li>
              <strong className="font-mono text-xs uppercase text-fog">leaving a note on a photo</strong>
              <br />
              Whatever name and message you enter is stored and shown publicly
              on that photo. Don't include anything you wouldn't want visible
              to anyone browsing the album.
            </li>
            <li>
              <strong className="font-mono text-xs uppercase text-fog">ordering from the shop</strong>
              <br />
              Name, email, a contact method (social handle, phone, etc.), and
              whatever note you leave. Used to fulfill the order and send a
              confirmation email — not used for marketing.
            </li>
            <li>
              <strong className="font-mono text-xs uppercase text-fog">signing in (earn / blackjack)</strong>
              <br />
              Sign-in uses Google via Firebase Authentication. Your email
              address is stored, tied to a points balance and activity
              (spins, game rounds, redemption requests).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">who else sees it</h2>
          <p>A few third-party services this site runs on:</p>
          <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-fog">
            <li>Vercel — hosting, and its own basic analytics/performance monitoring</li>
            <li>Cloudflare (R2) — photo storage</li>
            <li>Neon — database (points, orders, game state, analytics)</li>
            <li>Google (Firebase) — sign-in</li>
            <li>Zoho Mail — sends order confirmations and any other site email</li>
            <li>Discord — internal notifications (orders, redemptions) sent to a private channel only I can see</li>
          </ul>
          <p className="mt-2">
            None of these get your data for their own marketing purposes —
            they're infrastructure this site is built on, not third parties
            it shares data with for profit.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">cookies</h2>
          <p>
            A few first-party cookies keep you signed in, remember your
            passcode session where relevant, and recognize repeat visits for
            analytics. Nothing here is a third-party ad tracker.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">children</h2>
          <p>
            This site isn't directed at children, and knowingly collecting
            data from a child isn't the intent anywhere here. If you believe a
            child has provided information through this site, reach out and
            it'll be removed.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">your data</h2>
          <p>
            Want something deleted, corrected, or just want to know what's
            stored about you? Email{" "}
            <a href="mailto:rowi@saiaj.in" className="underline decoration-line underline-offset-4 hover:decoration-ink">
              rowi@saiaj.in
            </a>{" "}
            and it'll get sorted out directly — no formal request process,
            just ask.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">changes</h2>
          <p>
            This page will get updated as the site changes. Nothing formal —
            just check back if you're curious.
          </p>
        </section>
      </div>
    </main>
  );
}
