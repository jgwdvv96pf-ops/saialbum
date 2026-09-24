import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "terms & conditions",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <a href="/" className="font-mono text-xs text-fog transition hover:text-ink">
        ← saiaj.in
      </a>
      <h1 className="mb-2 mt-6 font-display text-3xl italic">terms & conditions</h1>
      <p className="mb-10 font-mono text-xs text-fog">last updated September 2026</p>

      <div className="flex flex-col gap-8 font-body text-sm leading-relaxed text-ink/90">
        <section>
          <h2 className="mb-2 font-display text-lg italic">the basics</h2>
          <p>
            saiaj.in is a personal site, run by one person, for fun and as a
            personal/portfolio project. Using it means agreeing to the below —
            nothing unusual, just laid out plainly.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">the shop</h2>
          <p>
            Items listed are pre-loved/secondhand pieces being sold informally.
            Placing an order records your interest — it isn't a binding
            purchase or an automatic charge. Payment, shipping, and any final
            details get arranged directly (via email or the contact method you
            provide) before anything's confirmed. Listings can be pulled or
            corrected at any time, including after an order's been placed, if
            something's no longer available.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">points, spins & blackjack</h2>
          <p>
            The points earned by spinning the wheel, and the "chips" used at
            the blackjack table, are <strong>play-money only</strong> — they
            have no cash value, cannot be purchased with real money, and
            aren't redeemable for real currency. They exist purely for fun and
            to unlock things like pre-loved items from the shop at my
            discretion. Balances can be reset, adjusted, or revoked at any
            time, including for suspected abuse of the system.
          </p>
          <p className="mt-2">
            Blackjack is played with friends in private rooms you create or
            get invited to. The dealer's commentary is flavor text — it never
            affects a hand's outcome, which is decided by a standard,
            server-side deterministic set of rules.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">accounts</h2>
          <p>
            Signing in (for /earn and blackjack) uses your own Google account
            via Firebase. You're responsible for whatever happens under your
            account — don't share access to it. Accounts found abusing the
            points system, spamming rooms, or otherwise misusing the site can
            be suspended or removed.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">the guestbook / notes</h2>
          <p>
            Anyone can leave a note on a photo without signing in. Don't post
            anything abusive, spammy, or otherwise unwelcome — notes like that
            get removed without notice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">no warranty</h2>
          <p>
            This site is provided as-is. It's a personal project, not a
            commercial product with uptime guarantees — things can break,
            change, or go offline without notice. To the extent the law
            allows, there's no liability for any loss or damage from using
            (or not being able to use) the site.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">changes</h2>
          <p>
            These terms might change as the site changes. Continuing to use
            the site after an update means you're fine with the new version.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-lg italic">questions</h2>
          <p>
            Email{" "}
            <a href="mailto:rowi@saiaj.in" className="underline decoration-line underline-offset-4 hover:decoration-ink">
              rowi@saiaj.in
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
