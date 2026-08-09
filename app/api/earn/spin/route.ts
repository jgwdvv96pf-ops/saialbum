import { NextResponse } from "next/server";
import { pickPrize } from "@/lib/earn/spin";

// PLACEHOLDER: this endpoint currently has no auth, no spin-credit
// check, and no persistence — anyone can call it for an unlimited
// number of spins. That's fine for prototyping the wheel mechanic,
// but before this is real: gate it behind a logged-in user, verify
// (and deduct) a spin credit atomically in Postgres, and record the
// result in a transaction log before responding.
export async function POST() {
  const { prize, index } = pickPrize();
  return NextResponse.json({ prize, index });
}
