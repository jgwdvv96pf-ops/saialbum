import MailApp from "@/components/mail/MailApp";

export default function MailPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="font-display text-2xl italic">mail</h1>
        <a href="/" className="font-mono text-xs text-fog transition hover:text-ink">
          ← back to site
        </a>
      </div>
      <MailApp />
    </main>
  );
}
