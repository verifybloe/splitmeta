"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MetaAlertRow, WatchlistRow } from "@/lib/watchlist";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function WatchlistPanel({
  items,
  alerts,
}: {
  items: WatchlistRow[];
  alerts: MetaAlertRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const unread = alerts.filter((a) => !a.readAt);

  async function unwatch(item: WatchlistRow) {
    setBusyId(item.id);
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unwatch",
          seriesId: item.seriesId,
          band: item.band,
        }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-read" }),
    });
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Watchlist</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Pin a series band from the meta board. We alert you when #1 moves.
            </p>
          </div>
          <Link
            href="/meta"
            className="text-sm text-red-400 hover:underline"
          >
            Browse meta →
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            Nothing watched yet. Open a band on the meta board and click{" "}
            <span className="text-neutral-300">Watch this band</span>.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{item.seriesName}</p>
                  <p className="text-sm text-neutral-500">
                    {item.bandLabel}
                    {item.lastTopFingerprint
                      ? ` · last #1 fp ${item.lastTopFingerprint}`
                      : " · waiting for first snapshot"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/meta?band=${encodeURIComponent(item.band)}`}
                    className="text-sm text-red-400 hover:underline"
                  >
                    Board
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void unwatch(item)}
                    className="text-sm text-neutral-500 hover:text-neutral-300 disabled:opacity-50"
                  >
                    Unwatch
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Meta moved</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {unread.length > 0
                ? `${unread.length} unread alert${unread.length === 1 ? "" : "s"}`
                : "No unread alerts"}
            </p>
          </div>
          {unread.length > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-sm text-neutral-400 hover:text-neutral-200"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        {alerts.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            Alerts show up after watched bands recompute with a new #1 setup.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  alert.readAt
                    ? "border-neutral-800 bg-neutral-950 text-neutral-400"
                    : "border-red-900/50 bg-red-950/20 text-neutral-200"
                }`}
              >
                <p>{alert.message}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
                  <span>{formatWhen(alert.createdAt)}</span>
                  <span>Week {alert.weekNum}</span>
                  <Link
                    href={alert.boardHref}
                    className="text-red-400 hover:underline"
                  >
                    Open board →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
