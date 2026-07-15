import { getUserRecentRaces } from "@/lib/metaCompute";

export type TrendPoint = {
  id: string;
  racedAt: string;
  label: string;
  finishPos: number;
  fieldSize: number;
  finishPct: number; // 0–1, lower is better (1st = small)
  bestLapMs: number;
  incidents: number;
  iratingAfter: number;
  irDelta: number;
  series: string;
  car: string;
};

export type UserTrends = {
  points: TrendPoint[];
  summary: {
    races: number;
    avgFinishPct: number | null;
    topFiveRate: number | null;
    avgIncidents: number | null;
    irNet: number | null;
    irStart: number | null;
    irEnd: number | null;
    bestFinish: number | null;
  };
};

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export async function getUserTrends(
  userId: string,
  limit = 20,
): Promise<UserTrends> {
  const races = await getUserRecentRaces(userId, limit);
  // Chronological for charts (oldest → newest)
  const chronological = [...races].reverse();

  const points: TrendPoint[] = chronological.map((race) => {
    const finishPct =
      race.fieldSize > 1
        ? (race.finishPos - 1) / (race.fieldSize - 1)
        : 0;
    return {
      id: race.id,
      racedAt: race.racedAt.toISOString(),
      label: formatShortDate(race.racedAt.toISOString()),
      finishPos: race.finishPos,
      fieldSize: race.fieldSize,
      finishPct,
      bestLapMs: race.bestLapMs,
      incidents: race.incidents,
      iratingAfter: race.iratingAfter,
      irDelta: race.iratingAfter - race.iratingBefore,
      series: race.seriesWeek.series.name,
      car: race.setup.car.name,
    };
  });

  if (points.length === 0) {
    return {
      points: [],
      summary: {
        races: 0,
        avgFinishPct: null,
        topFiveRate: null,
        avgIncidents: null,
        irNet: null,
        irStart: null,
        irEnd: null,
        bestFinish: null,
      },
    };
  }

  const avgFinishPct =
    points.reduce((n, p) => n + p.finishPct, 0) / points.length;
  const topFiveRate =
    points.filter((p) => p.finishPos <= 5).length / points.length;
  const avgIncidents =
    points.reduce((n, p) => n + p.incidents, 0) / points.length;
  const irStart = races[races.length - 1]?.iratingBefore ?? null;
  const irEnd = races[0]?.iratingAfter ?? null;
  const irNet =
    irStart != null && irEnd != null ? irEnd - irStart : null;
  const bestFinish = Math.min(...points.map((p) => p.finishPos));

  return {
    points,
    summary: {
      races: points.length,
      avgFinishPct,
      topFiveRate,
      avgIncidents,
      irNet,
      irStart,
      irEnd,
      bestFinish,
    },
  };
}
