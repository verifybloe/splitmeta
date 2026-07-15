"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  seriesId: string;
  band: string;
  seedTopFingerprint?: string | null;
  initiallyWatching: boolean;
};

export function WatchlistButton({
  seriesId,
  band,
  seedTopFingerprint,
  initiallyWatching,
}: Props) {
  const router = useRouter();
  const [watching, setWatching] = useState(initiallyWatching);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: watching ? "unwatch" : "watch",
          seriesId,
          band,
          seedTopFingerprint: seedTopFingerprint ?? undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; watching?: boolean };
      if (!res.ok) {
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      setWatching(Boolean(data.watching));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
          watching
            ? "border border-red-700/60 bg-red-950/40 text-red-300 hover:bg-red-950/70"
            : "border border-neutral-700 bg-neutral-950 text-neutral-200 hover:border-red-600"
        }`}
      >
        {busy ? "…" : watching ? "Watching · Unwatch" : "Watch this band"}
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {!watching ? (
        <p className="max-w-[14rem] text-right text-xs text-neutral-500">
          Get an alert when #1 setup changes
        </p>
      ) : null}
    </div>
  );
}
