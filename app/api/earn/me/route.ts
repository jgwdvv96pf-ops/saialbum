import { NextResponse } from "next/server";
import { getOrCreateExternalId, getOrCreateUser } from "@/lib/earn/identity";

export async function GET() {
  const externalId = await getOrCreateExternalId();
  const user = await getOrCreateUser(externalId);
  return NextResponse.json({
    balance: user.balance,
    spinCredits: user.spin_credits,
  });
}
