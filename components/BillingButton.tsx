"use client";

import { useState } from "react";

type Props = {
  label?: string;
  className?: string;
  mode?: "checkout" | "portal";
};

export function BillingButton({
  label = "Go Pro — $8/mo",
  className = "rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-500",
  mode = "checkout",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const endpoint =
        mode === "portal" ? "/api/stripe/portal" : "/api/stripe/checkout";
      const res = await fetch(endpoint, { method: "POST" });
      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent("/account")}`;
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        alert(data.error ?? "Billing request failed");
        return;
      }
      window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={loading} className={className}>
      {loading ? "Loading…" : label}
    </button>
  );
}
