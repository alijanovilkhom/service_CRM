import { NextResponse } from "next/server";
import { mimeFromFilename, readAvatarFile } from "@/lib/avatars";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const data = await readAvatarFile(filename);
  if (!data) {
    return new NextResponse("Not found", { status: 404 });
  }

  const bytes = new Uint8Array(data);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": mimeFromFilename(filename),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
