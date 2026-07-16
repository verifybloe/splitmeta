import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiKeysEqual,
  fingerprintSetupParams,
  shortFingerprint,
} from "@/lib/ingest";
import { computeSeriesWeekMeta, buildPostRaceBriefing } from "@/lib/metaCompute";

export const runtime = "nodejs";

type IngestBody = {
  externalId?: string;
  series: string;
  seriesCategory?: string;
  car: string;
  carCategory?: string;
  track: string;
  trackConfig?: string | null;
  seasonYear: number;
  seasonQuarter: number;
  weekNum: number;
  sof: number;
  iratingBefore: number;
  iratingAfter: number;
  finishPos: number;
  startPos?: number | null;
  fieldSize: number;
  incidents: number;
  bestLapMs: number;
  avgLapMs: number;
  racedAt: string;
  setupParams: Record<string, unknown>;
  iracingCustId?: number;
  displayName?: string;
  sessionType?: string;
  isRace?: boolean;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function requireNumber(value: unknown, field: string): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function parseBody(raw: unknown): { data?: IngestBody; error?: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "JSON body required" };
  }
  const body = raw as Record<string, unknown>;

  const series = typeof body.series === "string" ? body.series.trim() : "";
  const car = typeof body.car === "string" ? body.car.trim() : "";
  const track = typeof body.track === "string" ? body.track.trim() : "";
  if (!series || !car || !track) {
    return { error: "series, car, and track are required strings" };
  }

  const setupParams =
    body.setupParams && typeof body.setupParams === "object" && !Array.isArray(body.setupParams)
      ? (body.setupParams as Record<string, unknown>)
      : null;
  if (!setupParams) {
    return { error: "setupParams object is required" };
  }

  const racedAt =
    typeof body.racedAt === "string" ? body.racedAt : null;
  if (!racedAt || Number.isNaN(Date.parse(racedAt))) {
    return { error: "racedAt must be an ISO datetime string" };
  }

  const numbers: Array<[keyof IngestBody, unknown]> = [
    ["seasonYear", body.seasonYear],
    ["seasonQuarter", body.seasonQuarter],
    ["weekNum", body.weekNum],
    ["sof", body.sof],
    ["iratingBefore", body.iratingBefore],
    ["iratingAfter", body.iratingAfter],
    ["finishPos", body.finishPos],
    ["fieldSize", body.fieldSize],
    ["incidents", body.incidents],
    ["bestLapMs", body.bestLapMs],
    ["avgLapMs", body.avgLapMs],
  ];

  const parsed: Record<string, number> = {};
  for (const [key, value] of numbers) {
    const n = requireNumber(value, key);
    if (n === null) {
      return { error: `${key} must be a number` };
    }
    parsed[key] = n;
  }

  if (parsed.seasonQuarter < 1 || parsed.seasonQuarter > 4) {
    return { error: "seasonQuarter must be 1-4" };
  }
  if (parsed.weekNum < 1 || parsed.weekNum > 13) {
    return { error: "weekNum must be 1-13" };
  }

  return {
    data: {
      externalId:
        typeof body.externalId === "string" && body.externalId.trim()
          ? body.externalId.trim()
          : undefined,
      series,
      seriesCategory:
        typeof body.seriesCategory === "string"
          ? body.seriesCategory
          : "Sports Car",
      car,
      carCategory:
        typeof body.carCategory === "string" ? body.carCategory : "Sports Car",
      track,
      trackConfig:
        typeof body.trackConfig === "string"
          ? body.trackConfig
          : body.trackConfig === null
            ? null
            : undefined,
      seasonYear: parsed.seasonYear,
      seasonQuarter: parsed.seasonQuarter,
      weekNum: parsed.weekNum,
      sof: parsed.sof,
      iratingBefore: parsed.iratingBefore,
      iratingAfter: parsed.iratingAfter,
      startPos:
        typeof body.startPos === "number" &&
        Number.isFinite(body.startPos) &&
        body.startPos > 0
          ? Math.round(body.startPos)
          : null,
      finishPos: parsed.finishPos,
      fieldSize: parsed.fieldSize,
      incidents: parsed.incidents,
      bestLapMs: parsed.bestLapMs,
      avgLapMs: parsed.avgLapMs,
      racedAt,
      setupParams,
      iracingCustId:
        typeof body.iracingCustId === "number" ? body.iracingCustId : undefined,
      displayName:
        typeof body.displayName === "string" ? body.displayName : undefined,
      sessionType:
        typeof body.sessionType === "string" ? body.sessionType : undefined,
      isRace: typeof body.isRace === "boolean" ? body.isRace : undefined,
    },
  };
}

async function authenticate(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw.startsWith("sm_")) return null;

  const prefix = raw.slice(0, 10);
  const candidates = await prisma.user.findMany({
    where: { uploadApiKeyPrefix: prefix },
    select: {
      id: true,
      email: true,
      plan: true,
      uploadApiKeyHash: true,
      iracingCustId: true,
      displayName: true,
    },
  });

  for (const user of candidates) {
    if (user.uploadApiKeyHash && apiKeysEqual(raw, user.uploadApiKeyHash)) {
      return user;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }

    const parsed = parseBody(json);
    if (!parsed.data) {
      return badRequest(parsed.error ?? "Invalid body");
    }
    const body = parsed.data;

    const sessionType = String(body.sessionType ?? "").toLowerCase();
    if (body.isRace === false) {
      return badRequest("Only race sessions are accepted for meta");
    }
    if (sessionType && !sessionType.includes("race")) {
      return badRequest(
        `Only race sessions are accepted (got ${body.sessionType})`,
      );
    }

    if (body.externalId) {
      const existing = await prisma.sessionResult.findUnique({
        where: {
          userId_externalId: {
            userId: user.id,
            externalId: body.externalId,
          },
        },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          sessionResultId: existing.id,
        });
      }
    }

    const fingerprint = fingerprintSetupParams(body.setupParams);
    const trackConfig = body.trackConfig?.trim() || "";

    const [car, track, series] = await Promise.all([
      prisma.car.upsert({
        where: { name: body.car },
        create: { name: body.car, category: body.carCategory ?? "Sports Car" },
        update: {},
      }),
      prisma.track.upsert({
        where: {
          name_config: { name: body.track, config: trackConfig },
        },
        create: { name: body.track, config: trackConfig },
        update: {},
      }),
      prisma.series.upsert({
        where: { name: body.series },
        create: {
          name: body.series,
          category: body.seriesCategory ?? "Sports Car",
        },
        update: {},
      }),
    ]);

    const seriesWeek = await prisma.seriesWeek.upsert({
      where: {
        seriesId_seasonYear_seasonQuarter_weekNum: {
          seriesId: series.id,
          seasonYear: body.seasonYear,
          seasonQuarter: body.seasonQuarter,
          weekNum: body.weekNum,
        },
      },
      create: {
        seriesId: series.id,
        trackId: track.id,
        seasonYear: body.seasonYear,
        seasonQuarter: body.seasonQuarter,
        weekNum: body.weekNum,
      },
      update: { trackId: track.id },
    });

    let setup = await prisma.setup.findUnique({
      where: {
        fingerprint_seriesWeekId: {
          fingerprint,
          seriesWeekId: seriesWeek.id,
        },
      },
    });

    if (!setup) {
      setup = await prisma.setup.create({
        data: {
          fingerprint,
          params: JSON.stringify(body.setupParams),
          uploadedById: user.id,
          carId: car.id,
          seriesWeekId: seriesWeek.id,
        },
      });
    }

    const result = await prisma.sessionResult.create({
      data: {
        externalId: body.externalId,
        userId: user.id,
        setupId: setup.id,
        seriesWeekId: seriesWeek.id,
        sof: body.sof,
        iratingBefore: body.iratingBefore,
        iratingAfter: body.iratingAfter,
        startPos: body.startPos ?? null,
        finishPos: body.finishPos,
        fieldSize: body.fieldSize,
        incidents: body.incidents,
        bestLapMs: body.bestLapMs,
        avgLapMs: body.avgLapMs,
        racedAt: new Date(body.racedAt),
      },
    });

    const profilePatch: {
      iracingCustId?: number;
      displayName?: string;
    } = {};
    if (body.iracingCustId && !user.iracingCustId) {
      profilePatch.iracingCustId = body.iracingCustId;
    }
    if (body.displayName && !user.displayName) {
      profilePatch.displayName = body.displayName;
    }
    if (Object.keys(profilePatch).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: profilePatch,
      });
    }

    const custId = body.iracingCustId ?? user.iracingCustId ?? null;
    let official: {
      ok: boolean;
      reason?: string;
    } | null = null;
    let finishPos = body.finishPos;
    let fieldSize = body.fieldSize;
    let iratingBefore = body.iratingBefore;

    if (body.externalId && custId) {
      try {
        const { enrichSessionResultFromOfficial } = await import(
          "@/lib/iracing/enrich"
        );
        const enriched = await enrichSessionResultFromOfficial({
          sessionResultId: result.id,
          subsessionId: body.externalId,
          custId,
          userId: user.id,
        });
        official = { ok: enriched.ok, reason: enriched.reason };
        if (enriched.ok) {
          if (enriched.finishPos != null) finishPos = enriched.finishPos;
          if (enriched.fieldSize != null) fieldSize = enriched.fieldSize;
          if (enriched.iratingBefore != null)
            iratingBefore = enriched.iratingBefore;
        }
      } catch (err) {
        console.error("Official results enrich failed:", err);
        official = { ok: false, reason: "enrich error" };
      }
    }

    // Refresh rankings for this week so the board can leave mock data.
    try {
      await computeSeriesWeekMeta(seriesWeek.id);
    } catch (err) {
      console.error("Meta recompute after ingest failed:", err);
    }

    const fpShort = shortFingerprint(fingerprint);
    let briefing = null;
    try {
      briefing = await buildPostRaceBriefing({
        plan: user.plan,
        seriesWeekId: seriesWeek.id,
        fingerprintShort: fpShort,
        iratingBefore,
        finishPos,
        fieldSize,
      });
    } catch (err) {
      console.error("Post-race briefing failed:", err);
    }

    return NextResponse.json({
      ok: true,
      sessionResultId: result.id,
      setupId: setup.id,
      fingerprint: fpShort,
      seriesWeekId: seriesWeek.id,
      briefing,
      official,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    console.error("Ingest error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
