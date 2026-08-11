export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { requireEarnUser } from "@/lib/earn/require-user";

export async function GET() {
  const result = await requireEarnUser();
  if ("error" in result) return result.error;

  return NextResponse.json({
    email: result.user.email,
    balance: result.user.balance,
    spinCredits: result.user.spin_credits,
  });
}
