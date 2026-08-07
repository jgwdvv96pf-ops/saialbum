import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET } from "@/lib/r2";
import { isAuthed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contentType } = await req.json();
  const key = `photos/${crypto.randomUUID()}.jpg`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || "image/jpeg",
  });

  // Valid for 5 minutes — plenty of time for the browser to PUT the file.
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

  return NextResponse.json({ uploadUrl, key });
}
