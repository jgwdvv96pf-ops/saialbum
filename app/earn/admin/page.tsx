import { listRedemptions } from "@/lib/earn/redemptions";
import RedemptionsAdmin from "@/components/earn/RedemptionsAdmin";

export const dynamic = "force-dynamic";

export default async function EarnAdminPage() {
  const redemptions = await listRedemptions();

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <a href="/earn" className="font-mono text-xs text-fog transition hover:text-ink">
        ← back to earn
      </a>
      <h1 className="mb-8 mt-6 font-display text-3xl italic">redemptions</h1>
      <RedemptionsAdmin redemptions={redemptions} />
    </main>
  );
}
