import { prisma } from "@/lib/prisma";
import { iracingApiConfigured, iracingDataGet } from "@/lib/iracing/client";

type OfficialDriverResult = {
  cust_id?: number;
  display_name?: string;
  finish_position?: number;
  starting_position?: number;
  incidents?: number;
  oldi_rating?: number;
  newi_rating?: number;
  best_lap_time?: number;
  average_lap?: number;
};

type OfficialSimSession = {
  simsession_number?: number;
  simsession_name?: string;
  simsession_type_name?: string;
  results?: OfficialDriverResult[];
};

type OfficialSubsession = {
  subsession_id?: number;
  event_strength_of_field?: number;
  strength_of_field?: number;
  session_results?: OfficialSimSession[];
};

function pickRaceSession(payload: OfficialSubsession): OfficialSimSession | null {
  const sessions = payload.session_results ?? [];
  if (!sessions.length) return null;

  const byName = sessions.find((s) => {
    const name = `${s.simsession_name ?? ""} ${s.simsession_type_name ?? ""}`.toLowerCase();
    return name.includes("race") && !name.includes("qual");
  });
  if (byName) return byName;

  return (
    sessions.find((s) => s.simsession_number === 0) ??
    sessions[sessions.length - 1] ??
    null
  );
}

function positionsAreZeroBased(results: OfficialDriverResult[]): boolean {
  return results.some((r) => Number(r.finish_position) === 0);
}

function toOneBased(pos: number, zeroBased: boolean): number {
  if (!Number.isFinite(pos) || pos < 0) return 0;
  return zeroBased ? Math.round(pos) + 1 : Math.round(pos);
}

/** iRacing often stores lap times in 1/10000s of a second. */
function lapToMs(raw: number | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  if (raw < 1_000_000) return Math.round(raw);
  return Math.round(raw / 10);
}

export type OfficialEnrichment = {
  ok: boolean;
  reason?: string;
  startPos?: number | null;
  finishPos?: number;
  fieldSize?: number;
  incidents?: number;
  sof?: number;
  iratingBefore?: number;
  iratingAfter?: number;
  bestLapMs?: number | null;
  avgLapMs?: number | null;
  driverLabel?: string;
};

export async function fetchOfficialSubsession(
  subsessionId: number,
): Promise<OfficialSubsession | null> {
  if (!iracingApiConfigured()) return null;
  return iracingDataGet<OfficialSubsession>("/data/results/get", {
    subsession_id: subsessionId,
    include_licenses: false,
  });
}

export function extractDriverFromOfficial(
  payload: OfficialSubsession,
  custId: number,
): OfficialEnrichment {
  const race = pickRaceSession(payload);
  const results = race?.results ?? [];
  if (!results.length) {
    return { ok: false, reason: "No race results in subsession" };
  }

  const mine = results.find((r) => Number(r.cust_id) === custId);
  if (!mine) {
    return { ok: false, reason: `cust_id ${custId} not in official results` };
  }

  const zeroBased = positionsAreZeroBased(results);
  const finishPos = toOneBased(Number(mine.finish_position), zeroBased);
  const startRaw = Number(mine.starting_position);
  const startPos =
    Number.isFinite(startRaw) && startRaw >= 0
      ? toOneBased(startRaw, zeroBased)
      : null;

  return {
    ok: true,
    startPos,
    finishPos: finishPos > 0 ? finishPos : undefined,
    fieldSize: results.length,
    incidents:
      mine.incidents != null && Number.isFinite(Number(mine.incidents))
        ? Number(mine.incidents)
        : undefined,
    sof:
      Number(payload.event_strength_of_field) ||
      Number(payload.strength_of_field) ||
      undefined,
    iratingBefore:
      mine.oldi_rating != null ? Number(mine.oldi_rating) : undefined,
    iratingAfter:
      mine.newi_rating != null ? Number(mine.newi_rating) : undefined,
    bestLapMs: lapToMs(mine.best_lap_time ?? undefined),
    avgLapMs: lapToMs(mine.average_lap ?? undefined),
    driverLabel: mine.display_name ? String(mine.display_name) : undefined,
  };
}

/**
 * Pull official iRacing results for a stored SessionResult and overwrite
 * telemetry guesses with authoritative start/finish/iR/SOF/incidents.
 */
export async function enrichSessionResultFromOfficial(input: {
  sessionResultId: string;
  subsessionId: string | number;
  custId: number;
  userId: string;
}): Promise<OfficialEnrichment> {
  if (!iracingApiConfigured()) {
    return { ok: false, reason: "iRacing API not configured" };
  }

  const subsessionId = Number(input.subsessionId);
  if (!Number.isFinite(subsessionId) || subsessionId <= 0) {
    return { ok: false, reason: "Invalid subsession id" };
  }

  const payload = await fetchOfficialSubsession(subsessionId);
  if (!payload) {
    return { ok: false, reason: "Could not load official results" };
  }

  const extracted = extractDriverFromOfficial(payload, input.custId);
  if (!extracted.ok) return extracted;

  await prisma.sessionResult.update({
    where: { id: input.sessionResultId },
    data: {
      ...(extracted.startPos != null ? { startPos: extracted.startPos } : {}),
      ...(extracted.finishPos != null ? { finishPos: extracted.finishPos } : {}),
      ...(extracted.fieldSize != null ? { fieldSize: extracted.fieldSize } : {}),
      ...(extracted.incidents != null ? { incidents: extracted.incidents } : {}),
      ...(extracted.sof != null && extracted.sof > 0 ? { sof: extracted.sof } : {}),
      ...(extracted.iratingBefore != null
        ? { iratingBefore: extracted.iratingBefore }
        : {}),
      ...(extracted.iratingAfter != null
        ? { iratingAfter: extracted.iratingAfter }
        : {}),
      ...(extracted.bestLapMs != null && extracted.bestLapMs > 0
        ? { bestLapMs: extracted.bestLapMs }
        : {}),
      ...(extracted.avgLapMs != null && extracted.avgLapMs > 0
        ? { avgLapMs: extracted.avgLapMs }
        : {}),
      officialSyncedAt: new Date(),
    },
  });

  if (extracted.driverLabel) {
    try {
      await prisma.user.updateMany({
        where: { id: input.userId, displayName: null },
        data: { displayName: extracted.driverLabel.split(/\s+/)[0] },
      });
    } catch {
      // non-fatal
    }
  }

  return extracted;
}
