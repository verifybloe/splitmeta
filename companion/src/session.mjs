import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const CONFIG_DIR = join(
  process.env.APPDATA ??
    join(process.env.USERPROFILE ?? ".", "AppData", "Roaming"),
  "SplitMeta",
);
const SESSION_PATH = join(CONFIG_DIR, "session.json");

const DEFAULT_TELEMETRY_DIR = join(
  process.env.USERPROFILE ?? ".",
  "Documents",
  "iRacing",
  "telemetry",
);

export function defaultSession() {
  return {
    siteUrl: "https://www.splitmeta.net",
    companionToken: "",
    apiKey: "",
    email: "",
    name: "",
    plan: "FREE",
    telemetryDir: DEFAULT_TELEMETRY_DIR,
    uploaded: [],
    activity: [],
  };
}

export function sessionPath() {
  return SESSION_PATH;
}

export function loadSession() {
  if (!existsSync(SESSION_PATH)) return null;
  try {
    return { ...defaultSession(), ...JSON.parse(readFileSync(SESSION_PATH, "utf8")) };
  } catch {
    return null;
  }
}

export function saveSession(session) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2));
}

export function clearSession() {
  if (existsSync(SESSION_PATH)) {
    unlinkSync(SESSION_PATH);
  }
}

export function isLoggedIn(session) {
  return Boolean(
    session?.companionToken?.startsWith("smc_") &&
      session?.apiKey?.startsWith("sm_") &&
      session?.email,
  );
}

export function pushActivity(session, entry) {
  const activity = [
    { time: new Date().toISOString(), ...entry },
    ...(session.activity ?? []),
  ].slice(0, 50);
  session.activity = activity;
  return session;
}

export function toWatcherConfig(session) {
  return {
    apiKey: session.apiKey,
    siteUrl: session.siteUrl,
    telemetryDir: session.telemetryDir,
    uploaded: session.uploaded ?? [],
  };
}

export function applyWatcherState(session, watcherConfig) {
  session.uploaded = watcherConfig.uploaded ?? session.uploaded;
  return session;
}
