import { listRecentAdjustments } from "@/lib/earn/adjustments";
import PointsAdmin from "@/components/earn/PointsAdmin";

export const dynamic = "force-dynamic";

export default async function PointsAdminPage() {
  const recent = await listRecentAdjustments();

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <a href="/earn/admin" className="font-mono text-xs text-fog transition hover:text-ink">
        ← back to redemptions
      </a>
      <h1 className="mb-8 mt-6 font-display text-3xl italic">adjust points</h1>
      <PointsAdmin recent={recent} />
    </main>
  );
}
