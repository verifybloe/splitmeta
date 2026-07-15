import { NextResponse } from "next/server";
import { computeAllWeeklyMeta } from "@/lib/metaCompute";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";

  // Production / Vercel must set CRON_SECRET (Vercel Cron sends it automatically).
  if (!secret) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      return false;
    }
    // Local/dev only: allow unauthenticated triggers when unset.
    return true;
  }

  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await computeAllWeeklyMeta();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Compute failed";
    console.error("compute-meta error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
