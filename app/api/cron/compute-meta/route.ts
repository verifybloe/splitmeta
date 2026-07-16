import { NextResponse } from "next/server";
import { computeAllWeeklyMeta } from "@/lib/metaCompute";
import { bearerMatches } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  // Always require a configured secret — never open cron in any environment.
  if (secret.length < 16) return false;
  return bearerMatches(req.headers.get("authorization"), secret);
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
