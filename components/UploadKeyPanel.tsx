"use client";

import { useState, useTransition } from "react";
import { rotateUploadApiKey } from "@/app/actions/uploadKey";

type Props = {
  prefix: string | null;
};

export function UploadKeyPanel({ prefix }: Props) {
  const [pending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onRotate() {
    setError(null);
    startTransition(async () => {
      const result = await rotateUploadApiKey();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setApiKey(result.apiKey);
    });
  }

  return (
    <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="text-lg font-semibold">Uploader API key</h2>
      <p className="mt-1 text-sm text-neutral-400">
        The companion app uses this key to upload race results. Treat it like a
        password.
      </p>

      <p className="mt-4 text-sm text-neutral-500">
        Status:{" "}
        {prefix ? (
          <span className="text-neutral-200">
            active (<code>{prefix}…</code>)
          </span>
        ) : (
          <span className="text-amber-400">not created yet</span>
        )}
      </p>

      <button
        type="button"
        onClick={onRotate}
        disabled={pending}
        className="mt-4 rounded-md bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-white disabled:opacity-60"
      >
        {pending
          ? "Generating…"
          : prefix
            ? "Rotate API key"
            : "Generate API key"}
      </button>

      {apiKey && (
        <div className="mt-4 rounded-md border border-emerald-700 bg-emerald-950/40 p-3">
          <p className="text-xs text-emerald-300">
            Copy now — you won&apos;t see the full key again.
          </p>
          <code className="mt-2 block break-all text-sm text-emerald-100">
            {apiKey}
          </code>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
