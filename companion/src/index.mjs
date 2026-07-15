#!/usr/bin/env node
import { existsSync } from "node:fs";
import {
  loadSession,
  saveSession,
  isLoggedIn,
  toWatcherConfig,
  applyWatcherState,
  sessionPath,
} from "./session.mjs";
import { createWatcher, listIbtFiles, processIbtFile } from "./watcher.mjs";

const args = new Set(process.argv.slice(2));
const uploadLatest = args.has("--upload-latest");

function log(event) {
  const time = new Date().toLocaleTimeString();
  if (event.type === "upload") {
    console.log(
      `[${time}] Uploaded ${event.filePath} → fingerprint ${event.result?.fingerprint ?? "?"}`,
    );
    globalThis.__splitmetaSession = applyWatcherState(
      globalThis.__splitmetaSession,
      globalThis.__splitmetaConfig,
    );
    saveSession(globalThis.__splitmetaSession);
    return;
  }
  if (event.type === "skip") {
    console.log(`[${time}] Skipped ${event.filePath}: ${event.reason}`);
  }
  if (event.type === "error") {
    console.error(`[${time}] Error: ${event.message}`);
  }
}

async function main() {
  const session = loadSession();
  if (!session || !isLoggedIn(session)) {
    console.error(
      "Not signed in. Launch the SplitMeta app and sign in, or run install.bat.",
    );
    process.exit(1);
  }

  const config = toWatcherConfig(session);
  globalThis.__splitmetaSession = session;
  globalThis.__splitmetaConfig = config;

  if (!existsSync(config.telemetryDir)) {
    console.error(`Telemetry folder not found: ${config.telemetryDir}`);
    process.exit(1);
  }

  if (uploadLatest) {
    const latest = listIbtFiles(config.telemetryDir)[0];
    if (!latest) {
      console.error("No .ibt files found.");
      process.exit(1);
    }
    const outcome = await processIbtFile(config, latest);
    console.log(outcome);
    if (outcome.uploaded) saveSession(session);
    return;
  }

  console.log("SplitMeta CLI watcher");
  console.log(`  Session: ${sessionPath()}`);
  console.log(`  Watching: ${config.telemetryDir}`);
  createWatcher(config, log);
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
