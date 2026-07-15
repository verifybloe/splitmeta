import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

const ZIP_NAME = "splitmeta-companion.zip";

function zipPath() {
  return join(process.cwd(), "companion", "dist", ZIP_NAME);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(
      new URL("/login?callbackUrl=/download", req.url),
    );
  }

  const path = zipPath();
  if (!existsSync(path)) {
    return NextResponse.json(
      { error: "Companion package not available. Try again later." },
      { status: 503 },
    );
  }

  const body = readFileSync(path);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${ZIP_NAME}"`,
      "Content-Length": String(body.length),
      "Cache-Control": "private, no-store",
    },
  });
}
