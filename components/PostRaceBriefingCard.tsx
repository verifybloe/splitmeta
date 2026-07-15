import type { PostRaceBriefing } from "@/lib/metaCompute";
import { formatPaceDelta } from "@/lib/mockMeta";
import Link from "next/link";

export function PostRaceBriefingCard({
  briefing,
  bandHref,
}: {
  briefing: PostRaceBriefing;
  bandHref?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        briefing.pro
          ? "border-red-600/35 bg-gradient-to-br from-red-950/40 to-neutral-900"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {briefing.pro ? "Pro post-race briefing" : "Post-race"}
        {briefing.verdict ? ` · ${briefing.verdict}` : ""}
      </p>
      <p className="mt-2 text-lg font-semibold text-neutral-50">
        {briefing.headline}
      </p>
      <p className="mt-1 text-sm text-neutral-400">{briefing.summary}</p>
      {briefing.pro && briefing.action ? (
        <p className="mt-3 rounded-lg border border-red-600/25 bg-red-950/30 px-3 py-2 text-sm text-neutral-100">
          {briefing.action}
        </p>
      ) : null}

      {briefing.pro && briefing.rank != null ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-neutral-500">Rank</dt>
            <dd className="text-lg font-semibold">#{briefing.rank}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Pace vs band</dt>
            <dd className="text-lg font-semibold text-emerald-400">
              {formatPaceDelta(briefing.paceDeltaMs ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Top-5</dt>
            <dd className="text-lg font-semibold">
              {briefing.topFiveRate != null
                ? `${Math.round(briefing.topFiveRate * 100)}%`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Sample</dt>
            <dd className="text-lg font-semibold">
              {briefing.sampleRaces} races
            </dd>
          </div>
        </dl>
      ) : null}

      {briefing.pro && briefing.keyDeltas?.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {briefing.keyDeltas.map((d) => (
            <li
              key={d}
              className="rounded-full bg-neutral-950/60 px-3 py-1 text-xs text-neutral-300"
            >
              {d}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {bandHref ? (
          <Link
            href={bandHref}
            className="text-sm font-medium text-red-400 hover:text-red-300"
          >
            Open meta board →
          </Link>
        ) : null}
        {!briefing.pro ? (
          <Link
            href="/account"
            className="text-sm font-medium text-red-400 hover:text-red-300"
          >
            Unlock Pro briefing →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
