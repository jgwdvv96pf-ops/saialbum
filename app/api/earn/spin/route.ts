import { NextResponse } from "next/server";
import { getOrCreateExternalId, getOrCreateUser } from "@/lib/earn/identity";
import { spendCreditAndSpin } from "@/lib/earn/ledger";

export async function POST() {
  const externalId = await getOrCreateExternalId();
  const user = await getOrCreateUser(externalId);

  try {
    const result = await spendCreditAndSpin(user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Spin failed";
    const status = message === "No spin credits" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
