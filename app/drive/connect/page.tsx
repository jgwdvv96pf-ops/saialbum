import { getStoredTokens, buildAuthorizeUrl } from "@/lib/drive/tokens";

export const dynamic = "force-dynamic";

export default async function DriveConnectPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const tokens = await getStoredTokens();
  const authorizeUrl = tokens ? null : buildAuthorizeUrl();

  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-3xl italic">drive</h1>

      {searchParams.error && (
        <p className="mt-4 max-w-sm font-mono text-xs text-red-700">
          {decodeURIComponent(searchParams.error)}
        </p>
      )}

      {tokens ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="font-mono text-xs text-fog">Google Drive is connected.</p>
          <a
            href="/drive"
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
          >
            go to gallery →
          </a>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="font-mono text-xs text-fog">Not connected yet.</p>
          <a
            href={authorizeUrl!}
            className="font-mono text-xs text-ink underline decoration-line underline-offset-4 transition hover:decoration-ink"
          >
            connect Google Drive →
          </a>
        </div>
      )}
    </main>
  );
}
