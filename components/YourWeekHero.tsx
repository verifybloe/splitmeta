import Link from "next/link";
import { formatPaceDelta } from "@/lib/mockMeta";
import type { UserWeekPulse } from "@/lib/metaCompute";

export function YourWeekHero({
  pulse,
  isPro,
  name,
}: {
  pulse: UserWeekPulse;
  isPro: boolean;
  name?: string | null;
}) {
  const greet = name?.split(" ")[0] || "Driver";
  const boardHref = pulse.board
    ? `/meta?band=${encodeURIComponent(pulse.board.band)}`
    : "/meta";

  if (!pulse.hasRaces) {
    return (
      <section className="relative overflow-hidden border-b border-neutral-800">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 15% -10%, rgba(220,38,38,0.22), transparent 55%), linear-gradient(180deg, #0a0a0a 0%, #171717 100%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-500">
            SplitMeta
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-neutral-50 sm:text-5xl">
            Your week starts when you upload.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-neutral-400">
            Hey {greet} — race with the companion on, and this home screen becomes
            your band&apos;s live meta pulse.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/download"
              className="rounded-md bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500"
            >
              Get the app
            </Link>
            <Link
              href="/meta"
              className="rounded-md border border-neutral-600 px-6 py-3 font-semibold text-neutral-200 hover:border-neutral-400"
            >
              Browse meta
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const top = pulse.board?.topEntry;
  const moved = pulse.board?.metaMoved;

  return (
    <section className="relative overflow-hidden border-b border-neutral-800">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 80% 0%, rgba(220,38,38,0.18), transparent 50%), linear-gradient(165deg, #0a0a0a 0%, #141414 55%, #0a0a0a 100%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6 pb-14 pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-red-500">
              SplitMeta · Your week
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
              {pulse.board?.series ?? pulse.lastRace?.series ?? "Your meta"}
            </h1>
            <p className="mt-2 text-neutral-400">
              {pulse.board
                ? `${pulse.board.track} · Week ${pulse.board.weekNum} · ${pulse.board.bandLabel}`
                : pulse.lastRace
                  ? `${pulse.lastRace.track} · Week ${pulse.lastRace.weekNum}`
                  : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {pulse.board?.updatedLabel ? (
              <span className="rounded-full border border-neutral-700 bg-neutral-900/80 px-3 py-1 text-neutral-400">
                Updated {pulse.board.updatedLabel}
              </span>
            ) : null}
            {pulse.board?.depth ? (
              <span
                className={`rounded-full border px-3 py-1 ${
                  pulse.board.depth.depth === "solid"
                    ? "border-emerald-700/60 text-emerald-400"
                    : pulse.board.depth.depth === "building"
                      ? "border-amber-700/60 text-amber-400"
                      : "border-neutral-700 text-neutral-400"
                }`}
              >
                {pulse.board.depth.label}
                {pulse.board.depth.totalRaces > 0
                  ? ` · ${pulse.board.depth.totalRaces} races`
                  : ""}
              </span>
            ) : null}
            {moved ? (
              <span className="animate-pulse rounded-full border border-red-600/50 bg-red-600/15 px-3 py-1 font-medium text-red-400">
                Meta moved since you raced
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/40 p-6 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Band #1 right now
            </p>
            {top ? (
              <>
                <p className="mt-3 text-2xl font-bold text-neutral-50">
                  <span className="text-red-500">#1</span> {top.setupLabel}
                </p>
                <dl className="mt-4 flex flex-wrap gap-6 text-sm text-neutral-400">
                  <div>
                    <dt className="text-neutral-500">Pace vs band</dt>
                    <dd className="text-lg font-semibold text-emerald-400">
                      {formatPaceDelta(top.paceDeltaMs)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Score</dt>
                    <dd className="text-lg font-semibold text-neutral-100">
                      {top.score}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Sample</dt>
                    <dd className="text-lg font-semibold text-neutral-100">
                      {top.sampleRaces} races
                    </dd>
                  </div>
                </dl>
                {isPro && top.keyDeltas?.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {top.keyDeltas.slice(0, 3).map((d) => (
                      <li
                        key={d}
                        className="rounded-full bg-neutral-900 px-3 py-1 text-xs text-neutral-300"
                      >
                        {d}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-neutral-400">
                Rankings for your last series/band are still forming. Keep
                uploading.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/50 p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Your last upload
            </p>
            {pulse.lastRace ? (
              <>
                <p className="mt-3 text-xl font-semibold text-neutral-50">
                  P{pulse.lastRace.finishPos}
                  <span className="text-neutral-500">
                    /{pulse.lastRace.fieldSize}
                  </span>
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  {pulse.lastRace.carName} · fp {pulse.lastRace.fingerprint}
                </p>
                {pulse.board?.yourRank != null ? (
                  <p className="mt-4 text-sm text-neutral-300">
                    Your setup ranks{" "}
                    <span className="font-semibold text-red-400">
                      #{pulse.board.yourRank}
                    </span>{" "}
                    in this band
                    {isPro && pulse.briefing?.pro
                      ? ` · ${pulse.briefing.verdict}`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-neutral-500">
                    Setup not ranked in this band yet.
                  </p>
                )}
                <p className="mt-2 text-xs text-neutral-600">
                  {pulse.uploadCount} upload{pulse.uploadCount === 1 ? "" : "s"}{" "}
                  on your account
                </p>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={boardHref}
            className="rounded-md bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500"
          >
            Open your board
          </Link>
          <Link
            href="/download"
            className="rounded-md border border-neutral-600 px-6 py-3 font-semibold text-neutral-200 hover:border-neutral-400"
          >
            Companion app
          </Link>
          {!isPro ? (
            <Link
              href="/account"
              className="rounded-md border border-red-700/50 px-6 py-3 font-semibold text-red-400 hover:border-red-500"
            >
              Unlock Pro
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
