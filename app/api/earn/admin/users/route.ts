import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { findUserByEmail } from "@/lib/earn/adjustments";

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "No user with that email" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
