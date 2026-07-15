import { NextResponse } from "next/server";
import { auth } from "@/auth";

const INSTALLER_URL =
  process.env.SPLITMETA_INSTALLER_URL ??
  "https://github.com/verifybloe/splitmeta/releases/latest/download/SplitMeta-Setup.exe";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(
      new URL("/login?callbackUrl=/download", process.env.NEXT_PUBLIC_APP_URL ?? "https://www.splitmeta.net"),
    );
  }

  return NextResponse.redirect(INSTALLER_URL);
}
