import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Plan } from "@/generated/prisma/client";
import type { MetaEntry, MetaSampleRace, WeeklyMetaView } from "@/lib/mockMeta";
import { FREE_BOARD_RACE_LIMIT } from "@/lib/limits";

export function secretsEqual(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function bearerMatches(header: string | null, secret: string): boolean {
  if (!header) return false;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return secretsEqual(match[1].trim(), secret);
}

/** Fresh plan from DB — do not trust JWT alone for Pro gates. */
export async function getUserPlan(userId: string): Promise<Plan> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return user?.plan ?? "FREE";
}

export async function requireProUser(
  userId: string | undefined | null,
): Promise<{ ok: true; plan: "PRO" } | { ok: false; status: 401 | 403 }> {
  if (!userId) return { ok: false, status: 401 };
  const plan = await getUserPlan(userId);
  if (plan !== "PRO") return { ok: false, status: 403 };
  return { ok: true, plan: "PRO" };
}

function redactEntry(
  entry: MetaEntry,
  opts: { locked: boolean; isPro: boolean },
): MetaEntry {
  const races = entry.sampleResults ?? [];
  const visibleRaces: MetaSampleRace[] = opts.isPro
    ? races
    : races.slice(0, FREE_BOARD_RACE_LIMIT);

  if (opts.locked) {
    return {
      ...entry,
      setupLabel: "Pro-only setup",
      fingerprint: "••••••",
      keyDeltas: [],
      score: 0,
      paceDeltaMs: 0,
      topFiveRate: 0,
      avgIncidents: 0,
      sampleResults: [],
    };
  }

  return {
    ...entry,
    sampleResults: visibleRaces,
  };
}

/** Strip Pro-only meta payload before sending to Free / logged-out clients. */
export function redactMetaForClient(
  meta: WeeklyMetaView,
  isPro: boolean,
): WeeklyMetaView {
  if (isPro) return meta;

  return {
    ...meta,
    entries: meta.entries.map((entry) =>
      redactEntry(entry, {
        locked: entry.rank > 3,
        isPro: false,
      }),
    ),
  };
}
