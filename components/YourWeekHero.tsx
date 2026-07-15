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
      <section className="relative flex min-h-[calc(100dvh-4.5rem)] flex-col justify-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 90% 70% at 50% -20%, rgba(220,38,38,0.28), transparent 55%),
              radial-gradient(ellipse 50% 40% at 100% 80%, rgba(220,38,38,0.08), transparent 50%),
              repeating-linear-gradient(
                -12deg,
                transparent,
                transparent 48px,
                rgba(255,255,255,0.015) 48px,
                rgba(255,255,255,0.015) 49px
              ),
              #0a0a0a
            `,
          }}
        />
        <div className="relative mx-auto w-full max-w-5xl px-6 py-16">
          <p className="text-sm font-semibold tracking-[0.28em] text-red-500 uppercase">
            SplitMeta
          </p>
          <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight text-neutral-50 sm:text-6xl lg:text-7xl">
            Your week starts when you upload.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-neutral-400 sm:text-xl">
            Hey {greet} — race with the companion on, and this screen becomes your
            band&apos;s live meta pulse.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/download"
              className="rounded-md bg-red-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-red-500"
            >
              Get the app
            </Link>
            <Link
              href="/meta"
              className="rounded-md border border-neutral-600 px-7 py-3.5 text-base font-semibold text-neutral-200 hover:border-neutral-400"
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
  const series =
    pulse.board?.series ?? pulse.lastRace?.series ?? "Your meta";
  const place = pulse.lastRace
    ? `P${pulse.lastRace.finishPos}`
    : top
      ? `#${top.rank}`
      : "—";
  const placeSub = pulse.lastRace
    ? `/${pulse.lastRace.fieldSize}`
    : "";

  return (
    <section className="relative flex min-h-[calc(100dvh-4.5rem)] flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 70% -30%, rgba(220,38,38,0.32), transparent 52%),
            radial-gradient(ellipse 60% 50% at 0% 100%, rgba(220,38,38,0.12), transparent 45%),
            repeating-linear-gradient(
              108deg,
              transparent,
              transparent 64px,
              rgba(255,255,255,0.018) 64px,
              rgba(255,255,255,0.018) 65px
            ),
            linear-gradient(180deg, #0a0a0a 0%, #111 45%, #0a0a0a 100%)
          `,
        }}
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between px-6 py-10 sm:py-12 lg:py-14">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.28em] text-red-500 uppercase">
                SplitMeta
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-neutral-50 sm:text-5xl lg:text-6xl">
                {series}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-neutral-400 sm:text-lg">
                {pulse.board
                  ? `${pulse.board.track} · Week ${pulse.board.weekNum} · ${pulse.board.bandLabel}`
                  : pulse.lastRace
                    ? `${pulse.lastRace.track} · Week ${pulse.lastRace.weekNum}`
                    : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
              {pulse.board?.updatedLabel ? (
                <span className="border border-neutral-700/80 bg-black/30 px-3 py-1.5 text-neutral-400 backdrop-blur-sm">
                  Updated {pulse.board.updatedLabel}
                </span>
              ) : null}
              {pulse.board?.depth ? (
                <span
                  className={`border px-3 py-1.5 backdrop-blur-sm ${
                    pulse.board.depth.depth === "solid"
                      ? "border-emerald-700/50 text-emerald-400"
                      : pulse.board.depth.depth === "building"
                        ? "border-amber-700/50 text-amber-400"
                        : "border-neutral-700/80 text-neutral-400"
                  }`}
                >
                  {pulse.board.depth.label}
                  {pulse.board.depth.totalRaces > 0
                    ? ` · ${pulse.board.depth.totalRaces} races`
                    : ""}
                </span>
              ) : null}
              {moved ? (
                <span className="animate-pulse border border-red-600/50 bg-red-600/15 px-3 py-1.5 font-medium text-red-400">
                  Meta moved
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-12 grid items-end gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-neutral-500 uppercase">
                Your last race
              </p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-7xl font-bold tracking-tighter text-neutral-50 sm:text-8xl lg:text-9xl">
                  {place}
                </span>
                <span className="text-3xl font-semibold text-neutral-600 sm:text-4xl">
                  {placeSub}
                </span>
              </p>
              {pulse.lastRace ? (
                <p className="mt-4 text-lg text-neutral-300">
                  {pulse.lastRace.carName}
                  <span className="text-neutral-600"> · </span>
                  <span className="font-mono text-base text-neutral-500">
                    fp {pulse.lastRace.fingerprint}
                  </span>
                </p>
              ) : null}
              {pulse.board?.yourRank != null ? (
                <p className="mt-3 text-base text-neutral-400">
                  Setup ranks{" "}
                  <span className="font-semibold text-red-400">
                    #{pulse.board.yourRank}
                  </span>{" "}
                  in this band
                  {isPro && pulse.briefing?.pro
                    ? ` · ${pulse.briefing.verdict}`
                    : ""}
                  <span className="text-neutral-600">
                    {" "}
                    · {pulse.uploadCount} upload
                    {pulse.uploadCount === 1 ? "" : "s"}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-base text-neutral-500">
                  Setup not ranked in this band yet · {pulse.uploadCount}{" "}
                  upload{pulse.uploadCount === 1 ? "" : "s"}
                </p>
              )}
            </div>

            <div className="border-t border-neutral-800 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-16">
              <p className="text-xs font-medium tracking-[0.18em] text-neutral-500 uppercase">
                Band #1 right now
              </p>
              {top ? (
                <>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
                    <span className="text-red-500">#1</span>{" "}
                    {top.setupLabel}
                  </p>
                  <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-neutral-800/80 pt-6">
                    <div>
                      <dt className="text-xs tracking-wide text-neutral-500 uppercase">
                        Pace
                      </dt>
                      <dd className="mt-1 text-xl font-semibold text-emerald-400 sm:text-2xl">
                        {formatPaceDelta(top.paceDeltaMs)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs tracking-wide text-neutral-500 uppercase">
                        Score
                      </dt>
                      <dd className="mt-1 text-xl font-semibold text-neutral-100 sm:text-2xl">
                        {top.score}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs tracking-wide text-neutral-500 uppercase">
                        Sample
                      </dt>
                      <dd className="mt-1 text-xl font-semibold text-neutral-100 sm:text-2xl">
                        {top.sampleRaces}
                      </dd>
                    </div>
                  </dl>
                  {isPro && top.keyDeltas?.length ? (
                    <p className="mt-6 text-sm text-neutral-400">
                      {top.keyDeltas.slice(0, 2).join(" · ")}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-lg text-neutral-400">
                  Rankings for your last series are still forming. Keep
                  uploading.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-neutral-800/80 pt-8 sm:mt-16 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <Link
              href={boardHref}
              className="rounded-md bg-red-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-red-500"
            >
              Open your board
            </Link>
            <Link
              href="/download"
              className="rounded-md border border-neutral-600 px-7 py-3.5 text-base font-semibold text-neutral-200 hover:border-neutral-400"
            >
              Companion app
            </Link>
            {!isPro ? (
              <Link
                href="/account"
                className="rounded-md border border-red-700/50 px-7 py-3.5 text-base font-semibold text-red-400 hover:border-red-500"
              >
                Unlock Pro
              </Link>
            ) : null}
          </div>
          <p className="max-w-sm text-sm text-neutral-500">
            Keep the companion running so next week&apos;s meta stays fresh for
            your band.
          </p>
        </div>
      </div>
    </section>
  );
}
