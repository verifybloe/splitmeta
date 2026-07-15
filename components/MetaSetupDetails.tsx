"use client";

import { useState } from "react";

type SetupPayload = {
  fingerprint: string;
  car: string;
  series: string;
  track: string;
  weekNum: number;
  params: Record<string, unknown>;
  note: string;
};

type Props = {
  seriesWeekId: string;
  fingerprint: string;
  setupLabel: string;
};

function formatValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, "");
  }
  if (typeof value === "string" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function MetaSetupDetails({ seriesWeekId, fingerprint, setupLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SetupPayload | null>(null);

  async function load() {
    if (data) {
      setOpen((v) => !v);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ seriesWeekId, fingerprint, format: "json" });
      const res = await fetch(`/api/meta/setup?${qs}`);
      const json = (await res.json()) as SetupPayload & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? `Failed (${res.status})`);
      }
      setData(json);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load setup");
    } finally {
      setLoading(false);
    }
  }

  function downloadUrl(format: "txt" | "json") {
    const qs = new URLSearchParams({
      seriesWeekId,
      fingerprint,
      format,
      ...(format === "json" ? { download: "1" } : {}),
    });
    return `/api/meta/setup?${qs}`;
  }

  const entries = data
    ? Object.entries(data.params).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="mt-4 border-t border-neutral-800 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:border-red-600 hover:text-white disabled:opacity-50"
        >
          {loading ? "Loading…" : open ? "Hide setup" : "View setup"}
        </button>
        {open && data ? (
          <>
            <a
              href={downloadUrl("txt")}
              className="text-sm text-red-400 hover:underline"
            >
              Download .txt
            </a>
            <a
              href={downloadUrl("json")}
              className="text-sm text-neutral-400 hover:underline"
            >
              Download .json
            </a>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      ) : null}

      {open && data ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
          <div className="border-b border-neutral-800 px-3 py-2 text-xs text-neutral-500">
            {setupLabel} · {data.note}
          </div>
          {entries.length === 0 ? (
            <p className="px-3 py-4 text-sm text-neutral-500">
              No numeric garage params were captured for this fingerprint.
            </p>
          ) : (
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Parameter</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([key, value]) => (
                    <tr key={key} className="border-t border-neutral-900">
                      <td className="px-3 py-1.5 font-mono text-xs text-neutral-400">
                        {key}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-neutral-100">
                        {formatValue(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
