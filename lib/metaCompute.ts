import { prisma } from "@/lib/prisma";
import { iratingToBand, shortFingerprint } from "@/lib/ingest";
import type { MetaEntry, WeeklyMetaView } from "@/lib/mockMeta";
import { RATING_BANDS } from "@/lib/mockMeta";
import type { RatingBand } from "@/generated/prisma/client";

type SetupAgg = {
  setupId: string;
  fingerprint: string;
  params: Record<string, unknown>;
  carName: string;
  results: Array<{
    bestLapMs: number;
    finishPos: number;
    fieldSize: number;
    incidents: number;
  }>;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseParams(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
}

function numericParams(params: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    }
  }
  return out;
}

function buildKeyDeltas(
  params: Record<string, number>,
  bandAvg: Record<string, number>,
): string[] {
  const deltas: Array<{ key: string; delta: number; text: string }> = [];
  for (const [key, value] of Object.entries(params)) {
    const baseline = bandAvg[key];
    if (baseline === undefined) continue;
    const delta = value - baseline;
    if (Math.abs(delta) < 0.05) continue;
    const rounded = Math.abs(delta) >= 1 ? delta.toFixed(0) : delta.toFixed(1);
    const sign = delta > 0 ? "+" : "";
    deltas.push({
      key,
      delta: Math.abs(delta),
      text: `${sign}${rounded} ${key} vs band average`,
    });
  }
  deltas.sort((a, b) => b.delta - a.delta);
  if (deltas.length === 0) {
    return ["Close to band-average settings"];
  }
  return deltas.slice(0, 3).map((d) => d.text);
}

function scoreSetup(input: {
  paceDeltaMs: number;
  topFiveRate: number;
  avgIncidents: number;
  sampleRaces: number;
}): number {
  // Negative paceDelta is faster → higher score
  const paceScore = clamp(50 - input.paceDeltaMs / 20, 0, 100);
  const finishScore = input.topFiveRate * 100;
  const incidentScore = clamp(100 - input.avgIncidents * 12, 0, 100);
  const confidence = clamp(input.sampleRaces / 8, 0.25, 1);
  const raw =
    paceScore * 0.45 + finishScore * 0.35 + incidentScore * 0.2;
  return Math.round(raw * confidence);
}

export async function computeSeriesWeekMeta(seriesWeekId: string) {
  const seriesWeek = await prisma.seriesWeek.findUnique({
    where: { id: seriesWeekId },
    include: {
      series: true,
      track: true,
      setups: {
        include: {
          car: true,
          results: true,
        },
      },
    },
  });

  if (!seriesWeek) {
    return { seriesWeekId, bandsUpdated: 0 };
  }

  const bands = RATING_BANDS.map((b) => b.id as RatingBand);
  let bandsUpdated = 0;

  for (const band of bands) {
    const bySetup = new Map<string, SetupAgg>();
    const allBestLaps: number[] = [];
    const bandParamSamples: Record<string, number[]> = {};

    for (const setup of seriesWeek.setups) {
      const bandResults = setup.results.filter(
        (r) => iratingToBand(r.iratingBefore) === band,
      );
      if (bandResults.length === 0) continue;

      const params = numericParams(parseParams(setup.params));
      for (const [key, value] of Object.entries(params)) {
        if (!bandParamSamples[key]) bandParamSamples[key] = [];
        bandParamSamples[key].push(value);
      }

      bySetup.set(setup.id, {
        setupId: setup.id,
        fingerprint: setup.fingerprint,
        params: parseParams(setup.params),
        carName: setup.car.name,
        results: bandResults.map((r) => ({
          bestLapMs: r.bestLapMs,
          finishPos: r.finishPos,
          fieldSize: r.fieldSize,
          incidents: r.incidents,
        })),
      });

      for (const r of bandResults) {
        allBestLaps.push(r.bestLapMs);
      }
    }

    if (bySetup.size === 0) {
      continue;
    }

    const bandMedian = median(allBestLaps);
    const bandAvgParams: Record<string, number> = {};
    for (const [key, values] of Object.entries(bandParamSamples)) {
      bandAvgParams[key] = avg(values);
    }

    const entries: MetaEntry[] = [...bySetup.values()]
      .map((setup) => {
        const bests = setup.results.map((r) => r.bestLapMs);
        const avgBest = avg(bests);
        const paceDeltaMs = Math.round(avgBest - bandMedian);
        const topFiveRate =
          setup.results.filter((r) => r.finishPos <= 5).length /
          setup.results.length;
        const avgIncidents = avg(setup.results.map((r) => r.incidents));
        const sampleRaces = setup.results.length;
        const score = scoreSetup({
          paceDeltaMs,
          topFiveRate,
          avgIncidents,
          sampleRaces,
        });

        return {
          rank: 0,
          setupLabel: `${setup.carName} · ${shortFingerprint(setup.fingerprint)}`,
          fingerprint: shortFingerprint(setup.fingerprint),
          score,
          sampleRaces,
          paceDeltaMs,
          topFiveRate,
          avgIncidents: Math.round(avgIncidents * 10) / 10,
          keyDeltas: buildKeyDeltas(
            numericParams(setup.params),
            bandAvgParams,
          ),
        };
      })
      .sort((a, b) => b.score - a.score || a.paceDeltaMs - b.paceDeltaMs)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const carCounts = new Map<string, number>();
    for (const setup of bySetup.values()) {
      carCounts.set(
        setup.carName,
        (carCounts.get(setup.carName) ?? 0) + setup.results.length,
      );
    }
    const topCar =
      [...carCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Mixed";

    const trackLabel = seriesWeek.track.config
      ? `${seriesWeek.track.name} — ${seriesWeek.track.config}`
      : seriesWeek.track.name;

    const view: WeeklyMetaView = {
      series: seriesWeek.series.name,
      car: topCar,
      track: trackLabel,
      seasonLabel: `${seriesWeek.seasonYear} Season ${seriesWeek.seasonQuarter}`,
      weekNum: seriesWeek.weekNum,
      band,
      bandLabel:
        RATING_BANDS.find((b) => b.id === band)?.label ?? band,
      computedAt: new Date().toISOString(),
      seriesWeekId: seriesWeek.id,
      seriesId: seriesWeek.seriesId,
      entries,
    };

    await prisma.weeklyMeta.upsert({
      where: {
        seriesWeekId_band: {
          seriesWeekId: seriesWeek.id,
          band,
        },
      },
      create: {
        seriesWeekId: seriesWeek.id,
        band,
        payload: JSON.stringify(view),
      },
      update: {
        payload: JSON.stringify(view),
        computedAt: new Date(),
      },
    });

    try {
      const { notifyWatchlistMetaMoved } = await import("@/lib/watchlist");
      await notifyWatchlistMetaMoved({
        seriesId: seriesWeek.seriesId,
        seriesName: seriesWeek.series.name,
        seriesWeekId: seriesWeek.id,
        weekNum: seriesWeek.weekNum,
        band,
        meta: view,
      });
    } catch (err) {
      console.error("watchlist notify failed:", err);
    }

    bandsUpdated += 1;
  }

  return { seriesWeekId, bandsUpdated };
}

export async function computeAllWeeklyMeta() {
  const weeks = await prisma.seriesWeek.findMany({
    select: { id: true },
    orderBy: [{ seasonYear: "desc" }, { seasonQuarter: "desc" }, { weekNum: "desc" }],
  });

  let updated = 0;
  for (const week of weeks) {
    const result = await computeSeriesWeekMeta(week.id);
    updated += result.bandsUpdated;
  }
  return { weeks: weeks.length, bandsUpdated: updated };
}

function emptyWeeklyMeta(preferredBand?: string): WeeklyMetaView {
  const band =
    preferredBand && RATING_BANDS.some((b) => b.id === preferredBand)
      ? preferredBand
      : "C_2000_2700";
  const bandLabel =
    RATING_BANDS.find((b) => b.id === band)?.label ?? "2000 – 2700 iR";

  return {
    series: "No race data yet",
    car: "—",
    track: "—",
    seasonLabel: "—",
    weekNum: 0,
    band,
    bandLabel,
    computedAt: new Date().toISOString(),
    entries: [],
  };
}

export type LiveSeriesOption = {
  seriesId: string;
  name: string;
  weekNum: number;
  seasonLabel: string;
  track: string;
  seriesWeekId: string;
};

/**
 * Series that currently have live meta — each entry is that series' newest
 * week with data. No past-week browsing.
 */
export async function listLiveSeriesOptions(): Promise<LiveSeriesOption[]> {
  try {
    const rows = await prisma.weeklyMeta.findMany({
      select: {
        seriesWeekId: true,
        computedAt: true,
        seriesWeek: {
          select: {
            id: true,
            weekNum: true,
            seasonYear: true,
            seasonQuarter: true,
            seriesId: true,
            series: { select: { id: true, name: true } },
            track: { select: { name: true, config: true } },
          },
        },
      },
      orderBy: { computedAt: "desc" },
    });

    const bestBySeries = new Map<
      string,
      {
        option: LiveSeriesOption;
        sortKey: number;
      }
    >();

    for (const row of rows) {
      const sw = row.seriesWeek;
      const seriesId = sw.seriesId;
      const sortKey =
        sw.seasonYear * 10000 + sw.seasonQuarter * 100 + sw.weekNum;
      const existing = bestBySeries.get(seriesId);
      if (existing && existing.sortKey >= sortKey) continue;

      const track = sw.track.config
        ? `${sw.track.name} — ${sw.track.config}`
        : sw.track.name;

      bestBySeries.set(seriesId, {
        sortKey,
        option: {
          seriesId,
          name: sw.series.name,
          weekNum: sw.weekNum,
          seasonLabel: `${sw.seasonYear} Season ${sw.seasonQuarter}`,
          track,
          seriesWeekId: sw.id,
        },
      });
    }

    return [...bestBySeries.values()]
      .sort((a, b) => b.sortKey - a.sortKey)
      .map((x) => x.option);
  } catch {
    return [];
  }
}

export async function getLatestMetaBoard(
  preferredBand?: string,
  options?: { allowMock?: boolean; seriesId?: string },
): Promise<{
  meta: WeeklyMetaView;
  source: "live" | "mock" | "empty";
}> {
  const allowMock = options?.allowMock === true;
  const seriesId = options?.seriesId;

  try {
    const bandFilter = preferredBand
      ? { band: preferredBand as RatingBand }
      : undefined;

    const latest = await prisma.weeklyMeta.findFirst({
      where: {
        ...bandFilter,
        ...(seriesId ? { seriesWeek: { seriesId } } : {}),
      },
      orderBy: [
        { seriesWeek: { seasonYear: "desc" } },
        { seriesWeek: { seasonQuarter: "desc" } },
        { seriesWeek: { weekNum: "desc" } },
        { computedAt: "desc" },
      ],
      include: {
        seriesWeek: { select: { seriesId: true } },
      },
    });

    if (latest) {
      const meta = JSON.parse(latest.payload) as WeeklyMetaView;
      if (meta.entries && Array.isArray(meta.entries)) {
        return {
          meta: {
            ...meta,
            seriesWeekId: meta.seriesWeekId ?? latest.seriesWeekId,
            seriesId: meta.seriesId ?? latest.seriesWeek.seriesId,
          },
          source: "live",
        };
      }
    }
  } catch {
    // fall through to empty / mock
  }

  if (allowMock) {
    const { MOCK_WEEKLY_META } = await import("@/lib/mockMeta");
    return { meta: MOCK_WEEKLY_META, source: "mock" };
  }

  return { meta: emptyWeeklyMeta(preferredBand), source: "empty" };
}

export async function getUserRecentRaces(userId: string, limit = 10) {
  return prisma.sessionResult.findMany({
    where: { userId },
    orderBy: { racedAt: "desc" },
    take: limit,
    select: {
      id: true,
      finishPos: true,
      fieldSize: true,
      incidents: true,
      iratingBefore: true,
      iratingAfter: true,
      bestLapMs: true,
      racedAt: true,
      seriesWeekId: true,
      seriesWeek: {
        select: {
          id: true,
          weekNum: true,
          seasonYear: true,
          seasonQuarter: true,
          series: { select: { name: true } },
          track: { select: { name: true, config: true } },
        },
      },
      setup: {
        select: {
          fingerprint: true,
          car: { select: { name: true } },
        },
      },
    },
  });
}

export type SampleDepth = "thin" | "building" | "solid";

export function sampleDepthFromMeta(meta: WeeklyMetaView): {
  depth: SampleDepth;
  totalRaces: number;
  setupCount: number;
  label: string;
} {
  const totalRaces = meta.entries.reduce((n, e) => n + e.sampleRaces, 0);
  const setupCount = meta.entries.length;
  let depth: SampleDepth = "thin";
  if (totalRaces >= 20 && setupCount >= 5) depth = "solid";
  else if (totalRaces >= 5 || setupCount >= 3) depth = "building";

  const label =
    depth === "solid"
      ? "Solid sample"
      : depth === "building"
        ? "Building sample"
        : "Thin sample — early data";

  return { depth, totalRaces, setupCount, label };
}

export function formatRelativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export type UserWeekPulse = {
  hasRaces: boolean;
  uploadCount: number;
  lastRace: {
    finishPos: number;
    fieldSize: number;
    series: string;
    track: string;
    weekNum: number;
    fingerprint: string;
    carName: string;
    racedAt: string;
    iratingBefore: number;
  } | null;
  board: {
    series: string;
    track: string;
    weekNum: number;
    bandLabel: string;
    band: string;
    computedAt: string;
    updatedLabel: string;
    topEntry: MetaEntry | null;
    yourRank: number | null;
    metaMoved: boolean;
    depth: ReturnType<typeof sampleDepthFromMeta>;
  } | null;
  briefing: PostRaceBriefing | null;
  alerts: Array<{
    id: string;
    message: string;
    bandLabel: string;
    boardHref: string;
    createdAt: string;
  }>;
};

export async function getUserWeekPulse(
  userId: string,
  plan: "FREE" | "PRO",
): Promise<UserWeekPulse> {
  const races = await getUserRecentRaces(userId, 15);
  const uploadCount = races.length;
  const latest = races[0] ?? null;

  const { listMetaAlerts } = await import("@/lib/watchlist");
  const alertRows =
    plan === "PRO"
      ? await listMetaAlerts(userId, { unreadOnly: true, limit: 5 })
      : [];
  const alerts = alertRows.map((a) => ({
    id: a.id,
    message: a.message,
    bandLabel: a.bandLabel,
    boardHref: a.boardHref,
    createdAt: a.createdAt,
  }));

  if (!latest) {
    return {
      hasRaces: false,
      uploadCount: 0,
      lastRace: null,
      board: null,
      briefing: null,
      alerts,
    };
  }

  const trackName = latest.seriesWeek.track.config
    ? `${latest.seriesWeek.track.name} — ${latest.seriesWeek.track.config}`
    : latest.seriesWeek.track.name;
  const fingerprint = shortFingerprint(latest.setup.fingerprint);
  const band = iratingToBand(latest.iratingBefore);

  const lastRace = {
    finishPos: latest.finishPos,
    fieldSize: latest.fieldSize,
    series: latest.seriesWeek.series.name,
    track: trackName,
    weekNum: latest.seriesWeek.weekNum,
    fingerprint,
    carName: latest.setup.car.name,
    racedAt: latest.racedAt.toISOString(),
    iratingBefore: latest.iratingBefore,
  };

  let briefing: PostRaceBriefing | null = null;
  try {
    briefing = await buildPostRaceBriefing({
      plan,
      seriesWeekId: latest.seriesWeekId,
      fingerprintShort: fingerprint,
      iratingBefore: latest.iratingBefore,
      finishPos: latest.finishPos,
      fieldSize: latest.fieldSize,
    });
  } catch {
    briefing = null;
  }

  const weekMeta = await prisma.weeklyMeta.findUnique({
    where: {
      seriesWeekId_band: {
        seriesWeekId: latest.seriesWeekId,
        band,
      },
    },
  });

  if (!weekMeta) {
    return {
      hasRaces: true,
      uploadCount,
      lastRace,
      board: null,
      briefing,
      alerts,
    };
  }

  const meta = JSON.parse(weekMeta.payload) as WeeklyMetaView;
  const depth = sampleDepthFromMeta(meta);
  const yourEntry = meta.entries.find(
    (e) =>
      e.fingerprint === fingerprint || e.fingerprint.startsWith(fingerprint),
  );
  const topEntry = meta.entries[0] ?? null;
  const racedAt = latest.racedAt.getTime();
  const computedAt = weekMeta.computedAt.getTime();
  const metaMoved =
    Boolean(topEntry) &&
    computedAt > racedAt &&
    yourEntry != null &&
    topEntry!.fingerprint !== yourEntry.fingerprint;

  return {
    hasRaces: true,
    uploadCount,
    lastRace,
    board: {
      series: meta.series,
      track: meta.track,
      weekNum: meta.weekNum,
      bandLabel: meta.bandLabel,
      band: meta.band,
      computedAt: weekMeta.computedAt.toISOString(),
      updatedLabel: formatRelativeTime(weekMeta.computedAt.toISOString()),
      topEntry,
      yourRank: yourEntry?.rank ?? null,
      metaMoved,
      depth,
    },
    briefing,
    alerts,
  };
}

export type PostRaceBriefing = {
  pro: boolean;
  fingerprint: string;
  rank: number | null;
  totalSetups: number;
  score: number | null;
  paceDeltaMs: number | null;
  topFiveRate: number | null;
  sampleRaces: number;
  keyDeltas: string[];
  bandLabel: string;
  series: string;
  track: string;
  weekNum: number;
  finishPos: number;
  fieldSize: number;
  verdict: "leading" | "competitive" | "outlier" | "thin" | "unranked";
  headline: string;
  summary: string;
  /** Clear next step: keep setup vs consider copying meta */
  action: string;
};

export async function buildPostRaceBriefing(input: {
  plan: "FREE" | "PRO";
  seriesWeekId: string;
  fingerprintShort: string;
  iratingBefore: number;
  finishPos: number;
  fieldSize: number;
}): Promise<PostRaceBriefing> {
  const band = iratingToBand(input.iratingBefore);
  const bandLabel =
    RATING_BANDS.find((b) => b.id === band)?.label ?? band;

  const base = {
    fingerprint: input.fingerprintShort,
    bandLabel,
    finishPos: input.finishPos,
    fieldSize: input.fieldSize,
    series: "",
    track: "",
    weekNum: 0,
    rank: null as number | null,
    totalSetups: 0,
    score: null as number | null,
    paceDeltaMs: null as number | null,
    topFiveRate: null as number | null,
    sampleRaces: 0,
    keyDeltas: [] as string[],
  };

  if (input.plan !== "PRO") {
    return {
      ...base,
      pro: false,
      verdict: "unranked",
      headline: "Race uploaded",
      summary:
        "Upgrade to Pro for a post-race briefing: your setup’s meta rank, pace vs band, and key deltas.",
      action: "Unlock Pro for rank, pace vs band, and a keep-or-copy call.",
    };
  }

  const row = await prisma.weeklyMeta.findUnique({
    where: {
      seriesWeekId_band: {
        seriesWeekId: input.seriesWeekId,
        band,
      },
    },
  });

  if (!row) {
    return {
      ...base,
      pro: true,
      verdict: "unranked",
      headline: "Race uploaded — meta still computing",
      summary:
        "Your result is in. Rankings for this band will appear once more data lands.",
      action: "Keep your current setup until this band’s meta ranks.",
    };
  }

  const meta = JSON.parse(row.payload) as WeeklyMetaView;
  const entry = meta.entries.find(
    (e) =>
      e.fingerprint === input.fingerprintShort ||
      e.fingerprint.startsWith(input.fingerprintShort),
  );
  const leader = meta.entries[0] ?? null;

  const shared = {
    ...base,
    pro: true as const,
    series: meta.series,
    track: meta.track,
    weekNum: meta.weekNum,
    bandLabel: meta.bandLabel || bandLabel,
    totalSetups: meta.entries.length,
  };

  if (!entry) {
    const leaderHint =
      leader?.keyDeltas?.length
        ? ` #1 in band highlights: ${leader.keyDeltas.slice(0, 2).join("; ")}.`
        : "";
    return {
      ...shared,
      verdict: "unranked",
      headline: "Race uploaded",
      summary: `P${input.finishPos} of ${input.fieldSize} saved. This setup isn’t ranked in ${shared.bandLabel} yet.`,
      action: `Open the meta board and compare to #1.${leaderHint}`,
    };
  }

  let verdict: PostRaceBriefing["verdict"] = "competitive";
  if (entry.sampleRaces < 3) verdict = "thin";
  else if (entry.rank <= 3) verdict = "leading";
  else if (entry.rank > Math.ceil(meta.entries.length * 0.6))
    verdict = "outlier";

  const paceSec = (entry.paceDeltaMs / 1000).toFixed(3);
  const paceText =
    entry.paceDeltaMs <= 0
      ? `${paceSec.replace(/^-/, "")}s faster than band median`
      : `+${paceSec}s vs band median`;

  const verdictLine =
    verdict === "leading"
      ? "You’re on a leading meta setup for this band."
      : verdict === "outlier"
        ? "This setup is an outlier vs what the band is running."
        : verdict === "thin"
          ? "Early data — treat the rank as provisional."
          : "Competitive setup for this band.";

  const leaderDeltas =
    leader && entry.rank > 1 && leader.keyDeltas?.length
      ? leader.keyDeltas.slice(0, 2).join("; ")
      : "";

  const action =
    verdict === "leading"
      ? "Keep this setup — you’re on leading meta for the band."
      : verdict === "outlier"
        ? leaderDeltas
          ? `Consider copying #1 from the meta board (${leaderDeltas}).`
          : "Consider copying #1 from the meta board — your setup is an outlier."
        : verdict === "thin"
          ? "Don’t force a copy yet — sample is thin. Race again, then re-check."
          : entry.rank === 1
            ? "Keep it — you’re #1 in this band."
            : leaderDeltas
              ? `Solid keep, or peek at #1 (${leaderDeltas}) if pace is off.`
              : "Solid keep — open the board only if pace feels off.";

  return {
    ...shared,
    rank: entry.rank,
    score: entry.score,
    paceDeltaMs: entry.paceDeltaMs,
    topFiveRate: entry.topFiveRate,
    sampleRaces: entry.sampleRaces,
    keyDeltas: entry.keyDeltas ?? [],
    verdict,
    headline: `Your setup is #${entry.rank} of ${meta.entries.length} in ${shared.bandLabel}`,
    summary: `P${input.finishPos}/${input.fieldSize} · ${paceText} · ${verdictLine}`,
    action,
  };
}

