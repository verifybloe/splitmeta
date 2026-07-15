import Link from "next/link";
import {
  MOCK_WEEKLY_META,
  RATING_BANDS,
  formatPaceDelta,
} from "@/lib/mockMeta";

export const metadata = {
  title: "Meta board — SplitMeta",
};

export default function MetaBoard() {
  const meta = MOCK_WEEKLY_META;

  return (
    <main className="flex-1 bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Split<span className="text-red-500">Meta</span>
          </Link>
          <span className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-400">
            Preview — mock data
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold">{meta.series}</h1>
        <p className="mt-1 text-neutral-400">
          {meta.car} · {meta.track} · {meta.seasonLabel}, Week {meta.weekNum}
        </p>

        {/* Band selector */}
        <div className="mt-6 flex flex-wrap gap-2">
          {RATING_BANDS.map((band) => (
            <span
              key={band.id}
              className={
                band.id === meta.band
                  ? "rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white"
                  : "cursor-not-allowed rounded-full border border-neutral-800 px-4 py-1.5 text-sm text-neutral-500"
              }
            >
              {band.label}
            </span>
          ))}
        </div>

        {/* Rankings */}
        <div className="mt-8 space-y-4">
          {meta.entries.map((entry) => {
            const locked = entry.rank > 3;
            return (
              <div
                key={entry.fingerprint}
                className={`rounded-xl border bg-neutral-900 p-5 ${
                  locked ? "border-neutral-800 opacity-60" : "border-neutral-700"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl font-bold text-red-500">
                      #{entry.rank}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {locked ? "Pro-only setup" : entry.setupLabel}
                      </p>
                      <p className="text-sm text-neutral-500">
                        fingerprint {locked ? "••••••" : entry.fingerprint} ·{" "}
                        {entry.sampleRaces} races sampled
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-neutral-500">Score</p>
                      <p className="text-lg font-semibold">{entry.score}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-500">Pace vs band</p>
                      <p className="text-lg font-semibold text-emerald-400">
                        {formatPaceDelta(entry.paceDeltaMs)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-500">Top-5 rate</p>
                      <p className="text-lg font-semibold">
                        {Math.round(entry.topFiveRate * 100)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-500">Avg inc.</p>
                      <p className="text-lg font-semibold">
                        {entry.avgIncidents.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                {!locked && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {entry.keyDeltas.map((delta) => (
                      <li
                        key={delta}
                        className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300"
                      >
                        {delta}
                      </li>
                    ))}
                  </ul>
                )}
                {locked && (
                  <p className="mt-4 text-sm text-neutral-500">
                    Parameter deltas and one-click install available on Pro.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-red-600/40 bg-red-600/10 p-6 text-center">
          <p className="font-semibold">
            Unlock the full board for your band — $8/mo
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Full rankings, parameter deltas, one-click install, and your
            personal trends.
          </p>
        </div>
      </div>
    </main>
  );
}
