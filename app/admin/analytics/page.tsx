import {
  getSummary,
  getTopPages,
  getTopReferrers,
  getTopLocations,
  getVisitors,
} from "@/lib/analytics/stats";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  const days = Number(searchParams.days) || 30;

  const [summary, topPages, topReferrers, topLocations, visitors] = await Promise.all([
    getSummary(days),
    getTopPages(days),
    getTopReferrers(days),
    getTopLocations(days),
    getVisitors(days),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="font-display text-3xl italic">analytics</h1>
        <div className="flex gap-3 font-mono text-xs">
          {[7, 30, 90].map((d) => (
            <a
              key={d}
              href={`/admin/analytics?days=${d}`}
              className={days === d ? "text-ink underline decoration-ink underline-offset-4" : "text-fog hover:text-ink"}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      <div className="mb-10 grid grid-cols-3 gap-4">
        <div className="rounded-sm border border-line p-4">
          <p className="font-mono text-xs text-fog">page views</p>
          <p className="mt-1 font-display text-2xl italic">{summary.totalViews}</p>
        </div>
        <div className="rounded-sm border border-line p-4">
          <p className="font-mono text-xs text-fog">unique IPs</p>
          <p className="mt-1 font-display text-2xl italic">{summary.uniqueIps}</p>
        </div>
        <div className="rounded-sm border border-line p-4">
          <p className="font-mono text-xs text-fog">unique visitors</p>
          <p className="mt-1 font-display text-2xl italic">{summary.uniqueVisitors}</p>
        </div>
      </div>

      <div className="mb-10 grid gap-10 sm:grid-cols-2">
        <div>
          <p className="mb-3 font-mono text-xs text-fog">top pages</p>
          <ul className="flex flex-col divide-y divide-line border-t border-line">
            {topPages.map((p) => (
              <li key={p.path} className="flex justify-between py-2 font-mono text-xs">
                <span className="truncate text-ink">{p.path}</span>
                <span className="shrink-0 text-fog">{p.views}</span>
              </li>
            ))}
            {topPages.length === 0 && <li className="py-2 font-mono text-xs text-fog">no data yet</li>}
          </ul>
        </div>

        <div>
          <p className="mb-3 font-mono text-xs text-fog">top referrers</p>
          <ul className="flex flex-col divide-y divide-line border-t border-line">
            {topReferrers.map((r) => (
              <li key={r.referrer} className="flex justify-between py-2 font-mono text-xs">
                <span className="truncate text-ink">{r.referrer}</span>
                <span className="shrink-0 text-fog">{r.views}</span>
              </li>
            ))}
            {topReferrers.length === 0 && <li className="py-2 font-mono text-xs text-fog">no data yet</li>}
          </ul>
        </div>
      </div>

      <div className="mb-10">
        <p className="mb-3 font-mono text-xs text-fog">top locations</p>
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {topLocations.map((l, i) => (
            <li key={i} className="flex justify-between py-2 font-mono text-xs">
              <span className="text-ink">{l.city}, {l.country}</span>
              <span className="shrink-0 text-fog">{l.views}</span>
            </li>
          ))}
          {topLocations.length === 0 && <li className="py-2 font-mono text-xs text-fog">no data yet</li>}
        </ul>
      </div>

      <div>
        <p className="mb-3 font-mono text-xs text-fog">visitors ({visitors.length})</p>
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {visitors.map((v) => (
            <li key={v.ip} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-mono text-sm text-ink">{v.ip}</span>
                <span className="font-mono text-xs text-fog">
                  {v.city ? `${v.city}, ` : ""}{v.country || "unknown"}
                </span>
                <span className="font-mono text-xs text-fog">{v.views} views</span>
                <span className="font-mono text-xs text-fog">
                  {formatDate(v.first_seen)} → {formatDate(v.last_seen)}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-[11px] text-fog">
                {v.paths.join(", ")}
              </p>
            </li>
          ))}
          {visitors.length === 0 && <li className="py-2 font-mono text-xs text-fog">no data yet</li>}
        </ul>
      </div>
    </main>
  );
}
