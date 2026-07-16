import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function generateCompanionToken(): {
  raw: string;
  hash: string;
  prefix: string;
} {
  const raw = `smc_${randomBytes(32).toString("base64url")}`;
  return {
    raw,
    hash: hashCompanionToken(raw),
    prefix: raw.slice(0, 11),
  };
}

export function hashCompanionToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function companionTokensEqual(raw: string, hash: string): boolean {
  const a = Buffer.from(hashCompanionToken(raw), "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseCompanionAuthHeader(header: string | null) {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const raw = match[1].trim();
  if (!raw.startsWith("smc_")) return null;
  return raw;
}

export async function authenticateCompanionRequest(req: Request) {
  const raw = parseCompanionAuthHeader(req.headers.get("authorization"));
  if (!raw) return null;

  const prefix = raw.slice(0, 11);
  const candidates = await prisma.user.findMany({
    where: { companionTokenPrefix: prefix },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      image: true,
      companionTokenHash: true,
    },
  });

  for (const user of candidates) {
    if (
      user.companionTokenHash &&
      companionTokensEqual(raw, user.companionTokenHash)
    ) {
      return user;
    }
  }
  return null;
}
