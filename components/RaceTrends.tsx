import Link from "next/link";
import type { UserTrends } from "@/lib/trends";

function formatLap(ms: number) {
  if (!ms || ms <= 0) return "—";
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

function pctLabel(pct: number | null) {
  if (pct == null) return "—";
  return `${Math.round(pct * 100)}%`;
}

function SparkBars({
  values,
  invert,
  titles,
}: {
  values: number[];
  invert?: boolean;
  titles: string[];
}) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  return (
    <div className="flex h-28 items-end gap-1">
      {values.map((value, i) => {
        const norm = (value - min) / span;
        const height = invert ? 1 - norm : norm;
        const pct = Math.max(8, Math.round(height * 100));
        return (
          <div
            key={`${titles[i]}-${i}`}
            className="group relative flex-1 rounded-t bg-red-600/80 transition hover:bg-red-500"
            style={{ height: `${pct}%` }}
            title={titles[i]}
          >
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-neutral-300 group-hover:block">
              {titles[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SparkLine({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  if (values.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-neutral-500">
        Need at least 2 races for a line trend.
      </p>
    );
  }

  const w = 320;
  const h = 112;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const coords = values.map((value, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (value - min) / span) * (h - pad * 2);
    return { x, y, value, label: labels[i] };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full" role="img">
      <path
        d={path}
        fill="none"
        stroke="rgb(239 68 68)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c) => (
        <circle
          key={`${c.label}-${c.x}`}
          cx={c.x}
          cy={c.y}
          r="3.5"
          fill="#0a0a0a"
          stroke="rgb(252 165 165)"
          strokeWidth="1.5"
        >
          <title>
            {c.label}: {Math.round(c.value)}
          </title>
        </circle>
      ))}
    </svg>
  );
}

export function RaceTrends({
  trends,
  isPro,
  compact = false,
}: {
  trends: UserTrends;
  isPro: boolean;
  compact?: boolean;
}) {
  const { points, summary } = trends;

  if (!isPro) {
    return (
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="font-semibold">Personal trends</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Finish position, iRating, and pace history across your uploads.
        </p>
        <p className="mt-4 text-sm text-neutral-400">
          Pro unlocks trend charts for your last races.
        </p>
        <Link
          href="/account"
          className="mt-4 inline-block text-sm font-medium text-red-400 hover:underline"
        >
          Upgrade to Pro →
        </Link>
      </section>
    );
  }

  if (points.length === 0) {
    return (
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="font-semibold">Personal trends</h2>
        <p className="mt-4 text-sm text-neutral-500">
          Upload a few races with the companion and your finish / iR trends
          will show up here.
        </p>
      </section>
    );
  }

  const finishTitles = points.map(
    (p) => `${p.label}: P${p.finishPos}/${p.fieldSize}`,
  );
  const lapTitles = points.map(
    (p) => `${p.label}: ${formatLap(p.bestLapMs)}`,
  );
  const irLabels = points.map((p) => `${p.label}: ${p.iratingAfter} iR`);

  return (
    <section
      className={`rounded-xl border border-neutral-800 bg-neutral-900 ${compact ? "p-5" : "p-6"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Personal trends</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Last {summary.races} upload{summary.races === 1 ? "" : "s"} · oldest
            → newest
          </p>
        </div>
        {!compact ? (
          <Link href="/download" className="text-sm text-red-400 hover:underline">
            Keep uploading →
          </Link>
        ) : (
          <Link href="/account" className="text-sm text-red-400 hover:underline">
            Full trends →
          </Link>
        )}
      </div>

      <div
        className={`mt-5 grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"}`}
      >
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-3">
          <p className="text-xs text-neutral-500">Top-5 rate</p>
          <p className="mt-1 text-lg font-semibold text-neutral-100">
            {pctLabel(summary.topFiveRate)}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-3">
          <p className="text-xs text-neutral-500">Best finish</p>
          <p className="mt-1 text-lg font-semibold text-neutral-100">
            {summary.bestFinish != null ? `P${summary.bestFinish}` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-3">
          <p className="text-xs text-neutral-500">Avg incidents</p>
          <p className="mt-1 text-lg font-semibold text-neutral-100">
            {summary.avgIncidents != null
              ? summary.avgIncidents.toFixed(1)
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-3">
          <p className="text-xs text-neutral-500">iR change</p>
          <p
            className={`mt-1 text-lg font-semibold ${
              (summary.irNet ?? 0) > 0
                ? "text-emerald-400"
                : (summary.irNet ?? 0) < 0
                  ? "text-red-400"
                  : "text-neutral-100"
            }`}
          >
            {summary.irNet == null
              ? "—"
              : `${summary.irNet > 0 ? "+" : ""}${summary.irNet}`}
          </p>
        </div>
      </div>

      <div
        className={`mt-6 grid gap-6 ${compact ? "grid-cols-1" : "md:grid-cols-2"}`}
      >
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Finish place
          </p>
          <SparkBars
            values={points.map((p) => p.finishPos)}
            invert
            titles={finishTitles}
          />
          <p className="mt-2 text-xs text-neutral-600">
            Lower bars = better finishes
          </p>
        </div>

        {!compact ? (
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Best lap
            </p>
            <SparkBars
              values={points.map((p) => p.bestLapMs)}
              invert
              titles={lapTitles}
            />
            <p className="mt-2 text-xs text-neutral-600">
              Lower bars = faster laps
            </p>
          </div>
        ) : null}

        <div className={compact ? "" : "md:col-span-2"}>
          <p className="mb-3 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            iRating
          </p>
          <SparkLine
            values={points.map((p) => p.iratingAfter)}
            labels={irLabels}
          />
        </div>
      </div>
    </section>
  );
}
