"use client";

import Link from "next/link";
import { useState } from "react";
import { BillingButton } from "@/components/BillingButton";
import { iratingToBand, shortFingerprint } from "@/lib/ingest";
import { RATING_BANDS } from "@/lib/mockMeta";

import { FREE_RACE_DETAIL_LIMIT } from "@/lib/limits";

/** Free users can open full details on this many most-recent races. */
export { FREE_RACE_DETAIL_LIMIT };

export type RaceHistoryItem = {
  id: string;
  sof: number;
  finishPos: number;
  startPos: number | null;
  fieldSize: number;
  incidents: number;
  iratingBefore: number;
  iratingAfter: number;
  bestLapMs: number;
  avgLapMs: number;
  racedAt: string | Date;
  officialSyncedAt?: string | Date | null;
  seriesWeekId: string;
  seriesWeek: {
    id: string;
    weekNum: number;
    seasonYear: number;
    seasonQuarter: number;
    series: { id: string; name: string };
    track: { name: string; config: string | null };
  };
  setup: {
    fingerprint: string;
    car: { name: string };
  };
};

function formatLap(ms: number) {
  if (!ms || ms <= 0) return "—";
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

function positionsMoved(startPos: number | null, finishPos: number) {
  if (startPos == null || startPos <= 0 || finishPos <= 0) return null;
  return startPos - finishPos;
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2.5">
      <p className="text-[11px] tracking-wide text-neutral-500 uppercase">
        {label}
      </p>
      <p className={`mt-1 text-base font-semibold text-neutral-100 ${valueClassName ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function RaceRow({
  race,
  unlocked,
  isPro,
  iracingApiReady,
}: {
  race: RaceHistoryItem;
  unlocked: boolean;
  isPro: boolean;
  iracingApiReady: boolean;
}) {
  const [tab, setTab] = useState<"summary" | "details" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [officialAt, setOfficialAt] = useState(race.officialSyncedAt ?? null);
  const trackName = race.seriesWeek.track.config
    ? `${race.seriesWeek.track.name} — ${race.seriesWeek.track.config}`
    : race.seriesWeek.track.name;
  const irDelta = race.iratingAfter - race.iratingBefore;
  const irLabel =
    irDelta === 0 ? "iR ±0" : `iR ${irDelta > 0 ? "+" : ""}${irDelta}`;
  const moved = positionsMoved(race.startPos, race.finishPos);
  const band = iratingToBand(race.iratingBefore);
  const bandLabel = RATING_BANDS.find((b) => b.id === band)?.label ?? band;
  const boardHref = `/meta?series=${encodeURIComponent(race.seriesWeek.series.id)}&band=${encodeURIComponent(band)}`;
  const open = tab !== null;

  function toggle(next: "summary" | "details") {
    if (!unlocked) return;
    setTab((cur) => (cur === next ? null : next));
  }

  async function syncOfficial() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/iracing/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionResultId: race.id }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        enriched?: { ok?: boolean; reason?: string };
      };
      if (!res.ok || !data.ok) {
        setSyncMsg(data.error ?? data.enriched?.reason ?? "Sync failed");
      } else {
        setOfficialAt(new Date().toISOString());
        setSyncMsg("Synced from iRacing");
      }
    } catch {
      setSyncMsg("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <li className="py-4 first:pt-2 last:pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{race.seriesWeek.series.name}</p>
          <p className="mt-0.5 text-sm text-neutral-400">
            {race.setup.car.name} · {trackName}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Week {race.seriesWeek.weekNum} ·{" "}
            {new Date(race.racedAt).toLocaleString()} · setup{" "}
            {shortFingerprint(race.setup.fingerprint)}
            {officialAt ? (
              <span className="ml-2 text-emerald-500">· Official</span>
            ) : null}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-lg font-semibold">
            P{race.finishPos}
            <span className="text-base font-normal text-neutral-500">
              /{race.fieldSize}
            </span>
          </p>
          <p className="text-neutral-400">
            {formatLap(race.bestLapMs)} · {race.incidents}x ·{" "}
            <span
              className={
                irDelta > 0
                  ? "text-emerald-400"
                  : irDelta < 0
                    ? "text-red-400"
                    : ""
              }
            >
              {irLabel}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {unlocked ? (
          <>
            <button
              type="button"
              onClick={() => toggle("summary")}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                tab === "summary"
                  ? "border-red-600/50 bg-red-950/40 text-red-200"
                  : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
              }`}
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => toggle("details")}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                tab === "details"
                  ? "border-red-600/50 bg-red-950/40 text-red-200"
                  : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
              }`}
            >
              Details
            </button>
            {iracingApiReady ? (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void syncOfficial()}
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500 disabled:opacity-50"
              >
                {syncing ? "Syncing…" : officialAt ? "Re-sync official" : "Sync official"}
              </button>
            ) : null}
            {syncMsg ? (
              <span className="text-xs text-neutral-500">{syncMsg}</span>
            ) : null}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-dashed border-neutral-700 px-3 py-1.5 text-xs text-neutral-500">
              Details · Pro
            </span>
            <BillingButton
              label="Unlock all race details"
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-700 hover:text-red-300"
            />
          </div>
        )}
      </div>

      {open && unlocked ? (
        <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
          {tab === "summary" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Finish"
                value={`P${race.finishPos} / ${race.fieldSize}`}
              />
              <Stat
                label="Best lap"
                value={formatLap(race.bestLapMs)}
                valueClassName="text-emerald-400"
              />
              <Stat
                label="iR change"
                value={
                  irDelta === 0
                    ? "±0"
                    : `${irDelta > 0 ? "+" : ""}${irDelta}`
                }
                valueClassName={
                  irDelta > 0
                    ? "text-emerald-400"
                    : irDelta < 0
                      ? "text-red-400"
                      : ""
                }
              />
              <Stat
                label="Incidents"
                value={`${race.incidents}x`}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Start"
                  value={
                    race.startPos != null && race.startPos > 0
                      ? `P${race.startPos}`
                      : "—"
                  }
                />
                <Stat
                  label="Finish"
                  value={`P${race.finishPos} / ${race.fieldSize}`}
                />
                <Stat
                  label="Positions"
                  value={
                    moved == null
                      ? "—"
                      : moved === 0
                        ? "0"
                        : moved > 0
                          ? `+${moved} gained`
                          : `${moved} lost`
                  }
                  valueClassName={
                    moved == null
                      ? ""
                      : moved > 0
                        ? "text-emerald-400"
                        : moved < 0
                          ? "text-red-400"
                          : ""
                  }
                />
                <Stat label="SOF" value={race.sof > 0 ? String(race.sof) : "—"} />
                <Stat
                  label="Fastest lap"
                  value={formatLap(race.bestLapMs)}
                  valueClassName="text-emerald-400"
                />
                <Stat label="Average lap" value={formatLap(race.avgLapMs)} />
                <Stat label="Incidents" value={`${race.incidents}x`} />
                <Stat label="iRating band" value={bandLabel} />
                <Stat
                  label="iR before"
                  value={String(race.iratingBefore)}
                />
                <Stat label="iR after" value={String(race.iratingAfter)} />
                <Stat
                  label="iR delta"
                  value={
                    irDelta === 0
                      ? "±0"
                      : `${irDelta > 0 ? "+" : ""}${irDelta}`
                  }
                  valueClassName={
                    irDelta > 0
                      ? "text-emerald-400"
                      : irDelta < 0
                        ? "text-red-400"
                        : ""
                  }
                />
                <Stat
                  label="Setup"
                  value={shortFingerprint(race.setup.fingerprint)}
                />
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href={boardHref}
                  className="font-medium text-red-400 hover:text-red-300"
                >
                  Open meta for this band →
                </Link>
                {!isPro ? (
                  <span className="text-neutral-500">
                    Free: details on your {FREE_RACE_DETAIL_LIMIT} latest races
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function RaceHistoryList({
  races,
  isPro,
  iracingApiReady = false,
}: {
  races: RaceHistoryItem[];
  isPro: boolean;
  iracingApiReady?: boolean;
}) {
  return (
    <ul className="divide-y divide-neutral-800">
      {races.map((race, index) => (
        <RaceRow
          key={race.id}
          race={race}
          isPro={isPro}
          iracingApiReady={iracingApiReady}
          unlocked={isPro || index < FREE_RACE_DETAIL_LIMIT}
        />
      ))}
    </ul>
  );
}
