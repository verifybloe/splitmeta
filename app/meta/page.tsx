import Link from "next/link";
import {
  RATING_BANDS,
  formatPaceDelta,
} from "@/lib/mockMeta";
import { auth } from "@/auth";
import {
  formatRelativeTime,
  getLatestMetaBoard,
  listLiveSeriesOptions,
  sampleDepthFromMeta,
} from "@/lib/metaCompute";
import { BillingButton } from "@/components/BillingButton";
import { MetaSetupDetails } from "@/components/MetaSetupDetails";
import { MetaEntryResults } from "@/components/MetaEntryResults";
import { WatchlistButton } from "@/components/WatchlistButton";
import { isWatching } from "@/lib/watchlist";
import type { RatingBand } from "@/generated/prisma/client";

export const metadata = {
  title: "Meta board — SplitMeta",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ band?: string; series?: string }>;
};

function metaHref(opts: { band?: string; seriesId?: string }) {
  const params = new URLSearchParams();
  if (opts.seriesId) params.set("series", opts.seriesId);
  if (opts.band) params.set("band", opts.band);
  const q = params.toString();
  return q ? `/meta?${q}` : "/meta";
}

export default async function MetaBoard({ searchParams }: Props) {
  const session = await auth();
  const isPro = session?.user?.plan === "PRO";
  const { band, series: seriesParam } = await searchParams;
  const preferredBand =
    band && RATING_BANDS.some((b) => b.id === band) ? band : undefined;

  const seriesOptions = await listLiveSeriesOptions();
  const selectedSeriesId =
    seriesParam && seriesOptions.some((s) => s.seriesId === seriesParam)
      ? seriesParam
      : seriesOptions[0]?.seriesId;

  // Current series week only — newest week with data for that series.
  const { meta, source } = await getLatestMetaBoard(preferredBand, {
    seriesId: selectedSeriesId,
  });
  const hasLive = source === "live" && meta.entries.length > 0;
  const depth = sampleDepthFromMeta(meta);
  const updatedLabel = meta.computedAt
    ? formatRelativeTime(meta.computedAt)
    : "";

  const activeSeries =
    seriesOptions.find((s) => s.seriesId === (meta.seriesId ?? selectedSeriesId)) ??
    seriesOptions[0] ??
    null;

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
                <span className="rounded-full border border-neutral-800 px-2.5 py-1 text-neutral-500">
                  Current week only
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

        {seriesOptions.length > 0 ? (
          <div className="mt-8">
            <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Series
            </p>
            <div className="flex flex-wrap gap-2">
              {seriesOptions.map((option) => {
                const active =
                  option.seriesId ===
                  (meta.seriesId ?? selectedSeriesId ?? activeSeries?.seriesId);
                return (
                  <Link
                    key={option.seriesId}
                    href={metaHref({
                      seriesId: option.seriesId,
                      band: preferredBand ?? meta.band,
                    })}
                    className={
                      active
                        ? "rounded-lg border border-red-600/60 bg-red-600/15 px-3 py-2 text-sm font-medium text-red-300"
                        : "rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                    }
                    title={`${option.seasonLabel} · Week ${option.weekNum} · ${option.track}`}
                  >
                    <span className="block max-w-[16rem] truncate">
                      {option.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-neutral-500">
                      Week {option.weekNum}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
            iRating band
          </p>
          <div className="flex flex-wrap gap-2">
            {RATING_BANDS.map((bandOption) => {
              const active = bandOption.id === meta.band;
              return (
                <Link
                  key={bandOption.id}
                  href={metaHref({
                    seriesId: selectedSeriesId ?? meta.seriesId,
                    band: bandOption.id,
                  })}
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
        </div>

        {!hasLive ? (
          <div className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <p className="text-lg font-semibold">
              No live meta for this series / band yet
            </p>
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

                  {/* Race results stay visible so the board shows how people actually finished. */}
                  <MetaEntryResults
                    races={entry.sampleResults ?? []}
                    sampleRaces={entry.sampleRaces}
                    isPro={isPro}
                  />

                  {!locked && isPro && meta.seriesWeekId ? (
                    <MetaSetupDetails
                      seriesWeekId={meta.seriesWeekId}
                      fingerprint={entry.fingerprint}
                      setupLabel={entry.setupLabel}
                    />
                  ) : null}

                  {locked && (
                    <p className="mt-3 text-sm text-neutral-500">
                      Setup name, deltas, and parameter sheets unlock on Pro.
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
              Full rankings, parameter sheets, all sample race results, watchlist
              alerts, trend charts, and post-race briefing.
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
