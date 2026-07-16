import { createHash } from "node:crypto";

/**
 * iRacing OAuth masking: SHA-256(secret + lowercased(id)) → base64.
 * client_secret is masked with client_id; password with username.
 */
export function maskSecret(secret: string, id: string): string {
  const normalizedId = id.trim().toLowerCase();
  return createHash("sha256")
    .update(`${secret}${normalizedId}`, "utf8")
    .digest("base64");
}

export type IracingTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
};

type GlobalTokenCache = {
  __splitmetaIracingToken?: IracingTokenSet;
};

function tokenCache(): GlobalTokenCache {
  return globalThis as GlobalTokenCache;
}

export function iracingApiConfigured(): boolean {
  return Boolean(
    process.env.IRACING_OAUTH_CLIENT_ID &&
      process.env.IRACING_OAUTH_CLIENT_SECRET &&
      process.env.IRACING_OAUTH_USERNAME &&
      process.env.IRACING_OAUTH_PASSWORD,
  );
}

async function requestToken(
  body: Record<string, string>,
): Promise<IracingTokenSet> {
  const res = await fetch("https://oauth.iracing.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { error: text.slice(0, 200) };
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string"
        ? `iRacing OAuth: ${data.error}`
        : `iRacing OAuth failed (${res.status})`,
    );
  }
  const accessToken = String(data.access_token ?? "");
  if (!accessToken) throw new Error("iRacing OAuth: missing access_token");
  const expiresIn = Number(data.expires_in ?? 600);
  return {
    accessToken,
    refreshToken:
      typeof data.refresh_token === "string" ? data.refresh_token : null,
    expiresAt: Date.now() + Math.max(30, expiresIn - 30) * 1000,
  };
}

async function loginPasswordLimited(): Promise<IracingTokenSet> {
  const clientId = process.env.IRACING_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.IRACING_OAUTH_CLIENT_SECRET!;
  const username = process.env.IRACING_OAUTH_USERNAME!;
  const password = process.env.IRACING_OAUTH_PASSWORD!;

  return requestToken({
    grant_type: "password_limited",
    client_id: clientId,
    client_secret: maskSecret(clientSecret, clientId),
    username,
    password: maskSecret(password, username),
    scope: "iracing.auth",
  });
}

async function refresh(refreshToken: string): Promise<IracingTokenSet> {
  const clientId = process.env.IRACING_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.IRACING_OAUTH_CLIENT_SECRET!;
  return requestToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: maskSecret(clientSecret, clientId),
    refresh_token: refreshToken,
  });
}

export async function getIracingAccessToken(): Promise<string | null> {
  if (!iracingApiConfigured()) return null;

  const cache = tokenCache();
  const cached = cache.__splitmetaIracingToken;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  try {
    let next: IracingTokenSet;
    if (cached?.refreshToken) {
      try {
        next = await refresh(cached.refreshToken);
      } catch {
        next = await loginPasswordLimited();
      }
    } else {
      next = await loginPasswordLimited();
    }
    cache.__splitmetaIracingToken = next;
    return next.accessToken;
  } catch (err) {
    console.error("iRacing OAuth failed:", err);
    return null;
  }
}

/**
 * members-ng often returns `{ link: "https://..." }` — follow to JSON.
 */
export async function iracingDataGet<T = unknown>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<T | null> {
  const token = await getIracingAccessToken();
  if (!token) return null;

  const url = new URL(path, "https://members-ng.iracing.com");
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`iRacing data ${path} → ${res.status}`);
    return null;
  }

  const first = (await res.json()) as { link?: string } & T;
  if (first && typeof first === "object" && typeof first.link === "string") {
    const linked = await fetch(first.link);
    if (!linked.ok) {
      console.error(`iRacing link fetch → ${linked.status}`);
      return null;
    }
    return (await linked.json()) as T;
  }
  return first as T;
}
