import { prisma } from "@/lib/prisma";
import type { WeeklyMetaView } from "@/lib/mockMeta";
import type { RatingBand } from "@/generated/prisma/client";
import { RATING_BANDS } from "@/lib/mockMeta";

export type WatchlistRow = {
  id: string;
  seriesId: string;
  seriesName: string;
  band: RatingBand;
  bandLabel: string;
  lastTopFingerprint: string | null;
  createdAt: string;
};

export type MetaAlertRow = {
  id: string;
  seriesId: string;
  seriesName: string;
  band: RatingBand;
  bandLabel: string;
  seriesWeekId: string;
  weekNum: number;
  previousTop: string | null;
  newTop: string;
  previousLabel: string | null;
  newLabel: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
  boardHref: string;
};

function bandLabel(band: RatingBand | string) {
  return RATING_BANDS.find((b) => b.id === band)?.label ?? String(band);
}

export async function listWatchlist(userId: string): Promise<WatchlistRow[]> {
  const rows = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { series: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    seriesId: row.seriesId,
    seriesName: row.series.name,
    band: row.band,
    bandLabel: bandLabel(row.band),
    lastTopFingerprint: row.lastTopFingerprint,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listMetaAlerts(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number },
): Promise<MetaAlertRow[]> {
  const rows = await prisma.metaAlert.findMany({
    where: {
      userId,
      ...(options?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 20,
    include: { series: { select: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    seriesId: row.seriesId,
    seriesName: row.series.name,
    band: row.band,
    bandLabel: bandLabel(row.band),
    seriesWeekId: row.seriesWeekId,
    weekNum: row.weekNum,
    previousTop: row.previousTop,
    newTop: row.newTop,
    previousLabel: row.previousLabel,
    newLabel: row.newLabel,
    message: row.message,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    boardHref: `/meta?series=${encodeURIComponent(row.seriesId)}&band=${encodeURIComponent(row.band)}`,
  }));
}

export async function addWatchlistItem(input: {
  userId: string;
  seriesId: string;
  band: RatingBand;
  seedTopFingerprint?: string | null;
}) {
  return prisma.watchlistItem.upsert({
    where: {
      userId_seriesId_band: {
        userId: input.userId,
        seriesId: input.seriesId,
        band: input.band,
      },
    },
    create: {
      userId: input.userId,
      seriesId: input.seriesId,
      band: input.band,
      lastTopFingerprint: input.seedTopFingerprint ?? null,
    },
    update: {},
  });
}

export async function removeWatchlistItem(input: {
  userId: string;
  seriesId: string;
  band: RatingBand;
}) {
  return prisma.watchlistItem.deleteMany({
    where: {
      userId: input.userId,
      seriesId: input.seriesId,
      band: input.band,
    },
  });
}

export async function markAlertsRead(userId: string, ids?: string[]) {
  return prisma.metaAlert.updateMany({
    where: {
      userId,
      readAt: null,
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
}

/**
 * After a weekly meta recompute, notify watchers when #1 fingerprint changes.
 */
export async function notifyWatchlistMetaMoved(input: {
  seriesId: string;
  seriesName: string;
  seriesWeekId: string;
  weekNum: number;
  band: RatingBand;
  meta: WeeklyMetaView;
}) {
  const top = input.meta.entries[0];
  if (!top) return { watched: 0, alerts: 0 };

  const watches = await prisma.watchlistItem.findMany({
    where: { seriesId: input.seriesId, band: input.band },
  });
  if (watches.length === 0) return { watched: 0, alerts: 0 };

  let alerts = 0;
  for (const watch of watches) {
    const previous = watch.lastTopFingerprint;
    const moved = Boolean(previous) && previous !== top.fingerprint;

    if (moved) {
      const previousEntry = input.meta.entries.find(
        (e) => e.fingerprint === previous,
      );
      await prisma.metaAlert.create({
        data: {
          userId: watch.userId,
          seriesId: input.seriesId,
          band: input.band,
          seriesWeekId: input.seriesWeekId,
          weekNum: input.weekNum,
          previousTop: previous,
          newTop: top.fingerprint,
          previousLabel: previousEntry?.setupLabel ?? previous,
          newLabel: top.setupLabel,
          message: `${input.seriesName} · ${bandLabel(input.band)}: #1 moved to ${top.setupLabel} (was ${previousEntry?.setupLabel ?? previous}).`,
        },
      });
      alerts += 1;
    }

    await prisma.watchlistItem.update({
      where: { id: watch.id },
      data: { lastTopFingerprint: top.fingerprint },
    });
  }

  return { watched: watches.length, alerts };
}

export async function isWatching(
  userId: string,
  seriesId: string,
  band: RatingBand,
): Promise<boolean> {
  const row = await prisma.watchlistItem.findUnique({
    where: {
      userId_seriesId_band: { userId, seriesId, band },
    },
    select: { id: true },
  });
  return Boolean(row);
}
