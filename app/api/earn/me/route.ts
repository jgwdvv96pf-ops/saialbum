import { NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";

export async function GET() {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    return NextResponse.json({
      email: result.user.email,
      balance: result.user.balance,
      spinCredits: result.user.spin_credits,
    });
  });
}
