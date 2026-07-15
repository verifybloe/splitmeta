#!/usr/bin/env node
import { existsSync } from "node:fs";
import {
  loadConfig,
  saveConfig,
  runSetupWizard,
  configPath,
} from "./config.mjs";
import { createWatcher, listIbtFiles, processIbtFile } from "./watcher.mjs";

const args = new Set(process.argv.slice(2));
const isSetup = args.has("--setup");
const isDryRun = args.has("--dry-run");
const uploadLatest = args.has("--upload-latest");

function log(event) {
  const time = new Date().toLocaleTimeString();
  if (event.type === "upload") {
    console.log(
      `[${time}] Uploaded ${event.filePath} → fingerprint ${event.result?.fingerprint ?? "?"}`,
    );
    saveConfig(globalThis.__splitmetaConfig);
    return;
  }
  if (event.type === "skip") {
    console.log(`[${time}] Skipped ${event.filePath}: ${event.reason}`);
    return;
  }
  if (event.type === "error") {
    console.error(`[${time}] Error: ${event.message}`);
  }
}

async function main() {
  let config = loadConfig();

  if (isSetup || !config?.apiKey) {
    config = await runSetupWizard(config);
  }

  globalThis.__splitmetaConfig = config;

  if (!existsSync(config.telemetryDir)) {
    console.error(
      `\nTelemetry folder not found:\n  ${config.telemetryDir}\n\nEnable iRacing telemetry logging or fix the path in setup.`,
    );
    process.exit(1);
  }

  if (uploadLatest) {
    const latest = listIbtFiles(config.telemetryDir)[0];
    if (!latest) {
      console.error("No .ibt files found in telemetry folder.");
      process.exit(1);
    }
    const outcome = await processIbtFile(config, latest, { dryRun: isDryRun });
    console.log(outcome);
    if (outcome.uploaded) saveConfig(config);
    return;
  }

  console.log("SplitMeta companion running");
  console.log(`  Config: ${configPath()}`);
  console.log(`  Watching: ${config.telemetryDir}`);
  console.log(`  Uploading to: ${config.siteUrl}`);
  console.log("  Press Ctrl+C to stop.\n");

  createWatcher(config, log);

  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
