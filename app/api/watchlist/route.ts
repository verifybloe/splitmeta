import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RATING_BANDS } from "@/lib/mockMeta";
import type { RatingBand } from "@/generated/prisma/client";
import {
  addWatchlistItem,
  isWatching,
  listMetaAlerts,
  listWatchlist,
  markAlertsRead,
  removeWatchlistItem,
} from "@/lib/watchlist";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseBand(raw: string | null | undefined): RatingBand | null {
  if (!raw) return null;
  return RATING_BANDS.some((b) => b.id === raw) ? (raw as RatingBand) : null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { requireProUser } = await import("@/lib/security");
  const gate = await requireProUser(session.user.id);
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Sign in required" : "Pro required" },
      { status: gate.status },
    );
  }

  const url = new URL(req.url);
  const seriesId = url.searchParams.get("seriesId")?.trim() ?? "";
  const band = parseBand(url.searchParams.get("band"));

  if (seriesId && band) {
    const watching = await isWatching(session.user.id, seriesId, band);
    return NextResponse.json({ watching });
  }

  const [items, alerts] = await Promise.all([
    listWatchlist(session.user.id),
    listMetaAlerts(session.user.id, { limit: 30 }),
  ]);
  return NextResponse.json({ items, alerts });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { requireProUser } = await import("@/lib/security");
  const gate = await requireProUser(session.user.id);
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Sign in required" : "Pro required" },
      { status: gate.status },
    );
  }

  let body: {
    action?: string;
    seriesId?: string;
    band?: string;
    alertIds?: string[];
    seedTopFingerprint?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "mark-read") {
    await markAlertsRead(session.user.id, body.alertIds);
    return NextResponse.json({ ok: true });
  }

  const seriesId = String(body.seriesId ?? "").trim();
  const band = parseBand(body.band);
  if (!seriesId || !band) {
    return NextResponse.json(
      { error: "seriesId and band are required" },
      { status: 400 },
    );
  }

  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { id: true },
  });
  if (!series) {
    return NextResponse.json({ error: "Series not found" }, { status: 404 });
  }

  if (body.action === "unwatch") {
    await removeWatchlistItem({
      userId: session.user.id,
      seriesId,
      band,
    });
    return NextResponse.json({ ok: true, watching: false });
  }

  await addWatchlistItem({
    userId: session.user.id,
    seriesId,
    band,
    seedTopFingerprint: body.seedTopFingerprint ?? null,
  });
  return NextResponse.json({ ok: true, watching: true });
}
