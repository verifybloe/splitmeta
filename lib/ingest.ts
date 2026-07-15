import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { RatingBand } from "@/generated/prisma/client";

export function fingerprintSetupParams(params: Record<string, unknown>): string {
  const normalized = stableStringify(params);
  return createHash("sha256").update(normalized).digest("hex");
}

export function shortFingerprint(fingerprint: string): string {
  return fingerprint.slice(0, 6);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(",")}}`;
}

export function iratingToBand(irating: number): RatingBand {
  if (irating < 1350) return "ROOKIE_0_1350";
  if (irating < 2000) return "D_1350_2000";
  if (irating < 2700) return "C_2000_2700";
  if (irating < 3500) return "B_2700_3500";
  return "A_3500_PLUS";
}

export function generateUploadApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `sm_${randomBytes(24).toString("base64url")}`;
  return {
    raw,
    hash: hashApiKey(raw),
    prefix: raw.slice(0, 10),
  };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function apiKeysEqual(raw: string, hash: string): boolean {
  const a = Buffer.from(hashApiKey(raw), "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
