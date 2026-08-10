import { NextResponse } from "next/server";
import { requireEarnUser } from "@/lib/earn/require-user";
import { spendCreditAndSpin } from "@/lib/earn/ledger";

export async function POST() {
  const result = await requireEarnUser();
  if ("error" in result) return result.error;

  try {
    const spinResult = await spendCreditAndSpin(result.user.id);
    return NextResponse.json(spinResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Spin failed";
    const status = message === "No spin credits" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
