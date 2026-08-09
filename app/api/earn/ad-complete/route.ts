import { NextResponse } from "next/server";
import { getOrCreateExternalId, getOrCreateUser } from "@/lib/earn/identity";
import { grantSpinCredit } from "@/lib/earn/ledger";

// PLACEHOLDER: called directly by the client once the simulated ad
// finishes. A real ad network's server-to-server postback should hit
// its own endpoint instead — never trust the browser to say "the ad
// finished," since that's trivially fakeable from devtools.
export async function POST() {
  const externalId = await getOrCreateExternalId();
  const user = await getOrCreateUser(externalId);
  const spinCredits = await grantSpinCredit(user.id);
  return NextResponse.json({ spinCredits });
}
