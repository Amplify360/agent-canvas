import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// token → { file, expiresAt }
const PREVIEW_LINKS: Record<string, { file: string; expiresAt: string }> = {
  "74e44b9c-bbc3-4a96-b4d8-1426d0221e4b": {
    file: "reco_board_prep_brief_v3.html",
    expiresAt: "2026-03-05T23:59:59Z",
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const link = PREVIEW_LINKS[token];

  if (!link || new Date() > new Date(link.expiresAt)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = join(process.cwd(), "client-previews", link.file);
  const html = await readFile(filePath, "utf-8");

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "private, no-store",
    },
  });
}
