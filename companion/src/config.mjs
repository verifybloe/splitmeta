import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
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
    // uploaded subsession IDs, kept so restarts don't re-upload
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

export async function runSetupWizard(existing) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const config = existing ?? defaultConfig();

  console.log("\n=== SplitMeta companion setup ===");
  console.log("Get your API key at https://www.splitmeta.net/account\n");

  const apiKey = (
    await rl.question(
      `API key${config.apiKey ? ` [current: ${config.apiKey.slice(0, 10)}…]` : ""}: `,
    )
  ).trim();
  if (apiKey) config.apiKey = apiKey;

  const telemetryDir = (
    await rl.question(`iRacing telemetry folder [${config.telemetryDir}]: `)
  ).trim();
  if (telemetryDir) config.telemetryDir = telemetryDir;

  const siteUrl = (
    await rl.question(`SplitMeta URL [${config.siteUrl}]: `)
  ).trim();
  if (siteUrl) config.siteUrl = siteUrl.replace(/\/+$/, "");

  rl.close();

  if (!config.apiKey || !config.apiKey.startsWith("sm_")) {
    console.error(
      "\nNo valid API key entered (should start with sm_). Run setup again.",
    );
    process.exit(1);
  }

  saveConfig(config);
  console.log(`\nSaved config to ${CONFIG_PATH}\n`);
  return config;
}
