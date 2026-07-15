import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateUploadApiKey } from "@/lib/ingest";
import { companionZipStream } from "@/lib/companionPackage";

export const runtime = "nodejs";

const ZIP_NAME = "splitmeta-companion.zip";

function siteUrl(req: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    req.nextUrl.origin
  ).replace(/\/+$/, "");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(
      new URL("/login?callbackUrl=/download", req.url),
    );
  }

  const key = generateUploadApiKey();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      uploadApiKeyHash: key.hash,
      uploadApiKeyPrefix: key.prefix,
    },
  });

  const body = companionZipStream({
    apiKey: key.raw,
    siteUrl: siteUrl(req),
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${ZIP_NAME}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
