import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { shortFingerprint } from "@/lib/ingest";

export const runtime = "nodejs";

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

function paramsToText(
  params: Record<string, unknown>,
  meta: { car: string; fingerprint: string; series: string; track: string },
): string {
  const lines = [
    "SplitMeta setup parameter sheet",
    `Car: ${meta.car}`,
    `Series: ${meta.series}`,
    `Track: ${meta.track}`,
    `Fingerprint: ${meta.fingerprint}`,
    "",
    "Copy these values into your iRacing garage. This is not a .sto installer.",
    "",
  ];
  const keys = Object.keys(params).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const value = params[key];
    const display =
      typeof value === "number" || typeof value === "string" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);
    lines.push(`${key}=${display}`);
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Pro-only: full garage params for a ranked setup fingerprint.
 * GET ?seriesWeekId=&fingerprint=&format=json|txt
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (session.user.plan !== "PRO") {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  const url = new URL(req.url);
  const seriesWeekId = url.searchParams.get("seriesWeekId")?.trim() ?? "";
  const fingerprint = url.searchParams.get("fingerprint")?.trim() ?? "";
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();

  if (!seriesWeekId || !fingerprint) {
    return NextResponse.json(
      { error: "seriesWeekId and fingerprint are required" },
      { status: 400 },
    );
  }

  const setup = await prisma.setup.findFirst({
    where: {
      seriesWeekId,
      OR: [
        { fingerprint },
        { fingerprint: { startsWith: fingerprint } },
      ],
    },
    select: {
      fingerprint: true,
      params: true,
      car: { select: { name: true } },
      seriesWeek: {
        select: {
          weekNum: true,
          series: { select: { name: true } },
          track: { select: { name: true, config: true } },
        },
      },
    },
  });

  if (!setup) {
    return NextResponse.json({ error: "Setup not found" }, { status: 404 });
  }

  const params = parseParams(setup.params);
  const short = shortFingerprint(setup.fingerprint);
  const track = setup.seriesWeek.track.config
    ? `${setup.seriesWeek.track.name} — ${setup.seriesWeek.track.config}`
    : setup.seriesWeek.track.name;

  const payload = {
    fingerprint: short,
    fingerprintFull: setup.fingerprint,
    car: setup.car.name,
    series: setup.seriesWeek.series.name,
    track,
    weekNum: setup.seriesWeek.weekNum,
    params,
    note: "Parameter sheet for manual garage entry — not an iRacing .sto file.",
  };

  if (format === "txt") {
    const body = paramsToText(params, {
      car: payload.car,
      fingerprint: short,
      series: payload.series,
      track,
    });
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="splitmeta-${short}.txt"`,
      },
    });
  }

  if (format === "json") {
    const wantsDownload = url.searchParams.get("download") === "1";
    const body = `${JSON.stringify(payload, null, 2)}\n`;
    if (wantsDownload) {
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="splitmeta-${short}.json"`,
        },
      });
    }
    return NextResponse.json(payload);
  }

  return NextResponse.json({ error: "format must be json or txt" }, { status: 400 });
}
