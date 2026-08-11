import { NextResponse } from "next/server";
import { requireEarnUser, withErrorHandling } from "@/lib/earn/require-user";
import { grantSpinCredit } from "@/lib/earn/ledger";

// PLACEHOLDER: called directly by the client once the simulated ad
// finishes. A real ad network's server-to-server postback should hit
// its own endpoint instead — never trust the browser to say "the ad
// finished," since that's trivially fakeable from devtools.
export async function POST() {
  return withErrorHandling(async () => {
    const result = await requireEarnUser();
    if ("error" in result) return result.error;

    const spinCredits = await grantSpinCredit(result.user.id);
    return NextResponse.json({ spinCredits });
  });
}
