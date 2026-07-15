import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { companionZipStream } from "@/lib/companionPackage";

export const runtime = "nodejs";

const ZIP_NAME = "splitmeta-companion.zip";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(
      new URL("/login?callbackUrl=/download", req.url),
    );
  }

  const body = companionZipStream();

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${ZIP_NAME}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
