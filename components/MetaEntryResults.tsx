"use client";

import { useState } from "react";
import type { MetaSampleRace } from "@/lib/mockMeta";
import { BillingButton } from "@/components/BillingButton";

/** Free users see this many sample races per unlocked setup on the board. */
export const FREE_BOARD_RACE_LIMIT = 3;

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

export function MetaEntryResults({
  races,
  sampleRaces,
  isPro,
}: {
  races: MetaSampleRace[];
  sampleRaces: number;
  isPro: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!races.length && sampleRaces <= 0) return null;

  const visible = isPro ? races : races.slice(0, FREE_BOARD_RACE_LIMIT);
  const hiddenCount = Math.max(
    0,
    (races.length || sampleRaces) - visible.length,
  );

  return (
    <div className="mt-4 border-t border-neutral-800 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-red-400 hover:text-red-300"
      >
        {open ? "Hide results" : `Results · ${sampleRaces} race${sampleRaces === 1 ? "" : "s"}`}
      </button>

      {open ? (
        <div className="mt-3 space-y-2">
          {visible.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Results will appear after the next meta refresh.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
              {visible.map((race, i) => {
                const moved = positionsMoved(race.startPos, race.finishPos);
                const ir =
                  race.irDelta === 0
                    ? "±0 iR"
                    : `${race.irDelta > 0 ? "+" : ""}${race.irDelta} iR`;
                return (
                  <li
                    key={`${race.racedAt}-${race.finishPos}-${i}`}
                    className="flex flex-wrap items-start justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-100">
                        {race.driverLabel}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {new Date(race.racedAt).toLocaleString()}
                        {race.sof > 0 ? ` · SOF ${race.sof}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        P{race.finishPos}
                        <span className="font-normal text-neutral-500">
                          /{race.fieldSize}
                        </span>
                        {race.startPos != null && race.startPos > 0 ? (
                          <span className="ml-2 text-xs font-normal text-neutral-500">
                            from P{race.startPos}
                            {moved != null && moved !== 0
                              ? ` (${moved > 0 ? "+" : ""}${moved})`
                              : ""}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-neutral-400">
                        {formatLap(race.bestLapMs)} · {race.incidents}x ·{" "}
                        <span
                          className={
                            race.irDelta > 0
                              ? "text-emerald-400"
                              : race.irDelta < 0
                                ? "text-red-400"
                                : ""
                          }
                        >
                          {ir}
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!isPro && hiddenCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-neutral-700 px-3 py-2.5">
              <p className="text-xs text-neutral-500">
                +{hiddenCount} more race{hiddenCount === 1 ? "" : "s"} on Pro
              </p>
              <BillingButton
                label="Unlock all results"
                className="text-xs font-medium text-red-400 hover:text-red-300"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
