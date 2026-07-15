import Link from "next/link";
import {
  RATING_BANDS,
  formatPaceDelta,
} from "@/lib/mockMeta";
import { auth } from "@/auth";
import {
  formatRelativeTime,
  getLatestMetaBoard,
  sampleDepthFromMeta,
} from "@/lib/metaCompute";
import { BillingButton } from "@/components/BillingButton";
import { MetaSetupDetails } from "@/components/MetaSetupDetails";
import { WatchlistButton } from "@/components/WatchlistButton";
import { isWatching } from "@/lib/watchlist";
import type { RatingBand } from "@/generated/prisma/client";

export const metadata = {
  title: "Meta board — SplitMeta",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ band?: string }>;
};

export default async function MetaBoard({ searchParams }: Props) {
  const session = await auth();
  const isPro = session?.user?.plan === "PRO";
  const { band } = await searchParams;
  const preferredBand =
    band && RATING_BANDS.some((b) => b.id === band) ? band : undefined;

  // Never show mock filler on the real board — only live DB rankings.
  const { meta, source } = await getLatestMetaBoard(preferredBand);
  const hasLive = source === "live" && meta.entries.length > 0;
  const depth = sampleDepthFromMeta(meta);
  const updatedLabel = meta.computedAt
    ? formatRelativeTime(meta.computedAt)
    : "";

  const watching =
    isPro && session?.user?.id && meta.seriesId
      ? await isWatching(
          session.user.id,
          meta.seriesId,
          meta.band as RatingBand,
        )
      : false;

  return (
    <main className="flex-1 bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {hasLive ? meta.series : "Meta board"}
            </h1>
            <p className="mt-1 text-neutral-400">
              {hasLive
                ? `${meta.car} · ${meta.track} · ${meta.seasonLabel}, Week ${meta.weekNum}`
                : "Live rankings from crowd-sourced race uploads"}
            </p>
            {hasLive ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {updatedLabel ? (
                  <span className="rounded-full border border-neutral-800 px-2.5 py-1 text-neutral-400">
                    Updated {updatedLabel}
                  </span>
                ) : null}
                <span
                  className={`rounded-full border px-2.5 py-1 ${
                    depth.depth === "solid"
                      ? "border-emerald-800 text-emerald-400"
                      : depth.depth === "building"
                        ? "border-amber-800 text-amber-400"
                        : "border-neutral-800 text-neutral-500"
                  }`}
                >
                  {depth.label}
                  {depth.totalRaces > 0
                    ? ` · ${depth.totalRaces} races · ${depth.setupCount} setups`
                    : ""}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-400">
              {hasLive
                ? isPro
                  ? "Live meta · Pro unlocked"
                  : "Live meta · free top 3"
                : "Waiting for race data"}
            </span>
            {isPro && hasLive && meta.seriesId ? (
              <WatchlistButton
                seriesId={meta.seriesId}
                band={meta.band}
                seedTopFingerprint={meta.entries[0]?.fingerprint ?? null}
                initiallyWatching={watching}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {RATING_BANDS.map((bandOption) => {
            const active = bandOption.id === meta.band;
            return (
              <Link
                key={bandOption.id}
                href={`/meta?band=${bandOption.id}`}
                className={
                  active
                    ? "rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white"
                    : "rounded-full border border-neutral-800 px-4 py-1.5 text-sm text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                }
              >
                {bandOption.label}
              </Link>
            );
          })}
        </div>

        {!hasLive ? (
          <div className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <p className="text-lg font-semibold">No live meta for this band yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
              Rankings appear after drivers upload races with the SplitMeta app.
              Race with the companion watching, then refresh this page.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={
                  session?.user
                    ? "/download"
                    : "/login?callbackUrl=/download"
                }
                className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
              >
                {session?.user ? "Download app" : "Sign in to upload"}
              </Link>
              {session?.user && (
                <Link
                  href="/account"
                  className="rounded-md border border-neutral-700 px-4 py-2 font-medium text-neutral-300 hover:border-neutral-500"
                >
                  View my uploads
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {meta.entries.map((entry) => {
              const locked = !isPro && entry.rank > 3;
              return (
                <div
                  key={`${entry.fingerprint}-${entry.rank}`}
                  className={`rounded-xl border bg-neutral-900 p-5 ${
                    locked
                      ? "border-neutral-800 opacity-60"
                      : "border-neutral-700"
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
                    <>
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
                      {isPro && meta.seriesWeekId ? (
                        <MetaSetupDetails
                          seriesWeekId={meta.seriesWeekId}
                          fingerprint={entry.fingerprint}
                          setupLabel={entry.setupLabel}
                        />
                      ) : null}
                    </>
                  )}
                  {locked && (
                    <p className="mt-4 text-sm text-neutral-500">
                      Parameter sheets and deltas available on Pro.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isPro && hasLive && (
          <div className="mt-10 rounded-xl border border-red-600/40 bg-red-600/10 p-6 text-center">
            <p className="font-semibold">
              Unlock the full board for your band — $8/mo
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Full rankings, parameter sheets, watchlist alerts, post-race
              briefing, and your recent race history.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {session?.user ? (
                <BillingButton label="Upgrade to Pro" />
              ) : (
                <Link
                  href="/login?callbackUrl=/account"
                  className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                >
                  Sign in to upgrade
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
