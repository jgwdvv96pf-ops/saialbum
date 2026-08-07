import UploadForm from "@/components/UploadForm";
import LockButton from "@/components/LockButton";

export default function UploadPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <div className="mb-10 flex items-baseline justify-between border-b border-line pb-6">
        <a href="/" className="font-mono text-xs text-fog transition hover:text-ink">
          ← back to album
        </a>
        <LockButton />
      </div>
      <h1 className="mb-8 font-display text-3xl italic">upload</h1>
      <UploadForm />
    </main>
  );
}
