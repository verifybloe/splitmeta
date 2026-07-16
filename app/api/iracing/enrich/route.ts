import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { iracingApiConfigured } from "@/lib/iracing/client";
import { enrichSessionResultFromOfficial } from "@/lib/iracing/enrich";
import { computeSeriesWeekMeta } from "@/lib/metaCompute";

export const runtime = "nodejs";

/** Re-sync a stored race from official iRacing results (by subsession id). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!iracingApiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Official iRacing API is not configured on the server yet. Add OAuth env vars.",
      },
      { status: 503 },
    );
  }

  let body: { sessionResultId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionResultId = String(body.sessionResultId ?? "").trim();
  if (!sessionResultId) {
    return NextResponse.json(
      { error: "sessionResultId required" },
      { status: 400 },
    );
  }

  const row = await prisma.sessionResult.findFirst({
    where: { id: sessionResultId, userId: session.user.id },
    select: {
      id: true,
      externalId: true,
      seriesWeekId: true,
      user: { select: { iracingCustId: true } },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }
  if (!row.externalId) {
    return NextResponse.json(
      { error: "This race has no subsession id to look up" },
      { status: 400 },
    );
  }
  if (!row.user.iracingCustId) {
    return NextResponse.json(
      {
        error:
          "No iRacing customer id on your account yet — upload a race from the companion first.",
      },
      { status: 400 },
    );
  }

  const enriched = await enrichSessionResultFromOfficial({
    sessionResultId: row.id,
    subsessionId: row.externalId,
    custId: row.user.iracingCustId,
    userId: session.user.id,
  });

  if (enriched.ok) {
    try {
      await computeSeriesWeekMeta(row.seriesWeekId);
    } catch (err) {
      console.error("Meta recompute after official sync failed:", err);
    }
  }

  return NextResponse.json({ ok: enriched.ok, enriched });
}

export async function GET() {
  return NextResponse.json({
    configured: iracingApiConfigured(),
  });
}
