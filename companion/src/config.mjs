import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const CONFIG_DIR = join(
  process.env.APPDATA ?? join(process.env.USERPROFILE ?? ".", "AppData", "Roaming"),
  "SplitMeta",
);
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_TELEMETRY_DIR = join(
  process.env.USERPROFILE ?? ".",
  "Documents",
  "iRacing",
  "telemetry",
);

export function defaultConfig() {
  return {
    apiKey: "",
    siteUrl: "https://www.splitmeta.net",
    telemetryDir: DEFAULT_TELEMETRY_DIR,
    uploaded: [],
  };
}

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return { ...defaultConfig(), ...JSON.parse(readFileSync(CONFIG_PATH, "utf8")) };
  } catch {
    return null;
  }
}

export function saveConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function configPath() {
  return CONFIG_PATH;
}

function companionConnectPath() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "connect.json");
}

export function importConnectFile() {
  const path = companionConnectPath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const config = { ...defaultConfig(), ...parsed };
    if (!config.apiKey?.startsWith("sm_")) return null;
    saveConfig(config);
    return config;
  } catch {
    return null;
  }
}

export async function runSetupWizard(existing) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const config = existing ?? defaultConfig();

  console.log("\n=== SplitMeta companion setup ===\n");

  if (!config.apiKey?.startsWith("sm_")) {
    console.error(
      "No account link found. Download the companion again from https://www.splitmeta.net/download while signed in.",
    );
    rl.close();
    process.exit(1);
  }

  const telemetryDir = (
    await rl.question(`iRacing telemetry folder [${config.telemetryDir}]: `)
  ).trim();
  if (telemetryDir) config.telemetryDir = telemetryDir;

  rl.close();
  saveConfig(config);
  console.log(`\nSaved config to ${CONFIG_PATH}\n`);
  return config;
}
