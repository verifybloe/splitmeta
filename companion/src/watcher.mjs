import { readdirSync, statSync, existsSync, watch } from "node:fs";
import { join } from "node:path";
import { readSessionInfoYaml } from "./ibt.mjs";
import { parseSessionYaml } from "./sessionParse.mjs";
import { uploadSession } from "./upload.mjs";

// Wait for iRacing to finish writing, then for cool-down / finish data.
const STABLE_MS = 10000;
const RETRY_DELAY_MS = 8000;
const MAX_RETRIES = 24; // ~3+ minutes of retries after each change

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBusyError(err) {
  const code = err?.code ?? "";
  const message = err instanceof Error ? err.message : String(err);
  return (
    code === "EBUSY" ||
    code === "EPERM" ||
    code === "EACCES" ||
    /EBUSY|resource busy|locked/i.test(message)
  );
}

async function waitForFileReady(filePath) {
  let lastSize = -1;
  let stableCount = 0;

  for (let i = 0; i < 30; i++) {
    if (!existsSync(filePath)) {
      await sleep(1000);
      continue;
    }

    const size = statSync(filePath).size;
    if (size > 0 && size === lastSize) {
      stableCount += 1;
      if (stableCount >= 3) return;
    } else {
      stableCount = 0;
      lastSize = size;
    }
    await sleep(2000);
  }
}

export function listIbtFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".ibt"))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

export async function processIbtFile(config, filePath, { dryRun = false } = {}) {
  await waitForFileReady(filePath);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const yamlText = readSessionInfoYaml(filePath);
      const payload = parseSessionYaml(yamlText, filePath, filePath);

      if (
        payload.sessionType &&
        !payload.sessionType.toLowerCase().includes("race")
      ) {
        return {
          skipped: true,
          reason: `not a race session (${payload.sessionType})`,
        };
      }

      // Still racing / cool-down not reached yet — keep waiting.
      if (payload.waitingForResults || payload.finishPos <= 0) {
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        return {
          skipped: true,
          reason:
            payload.finishPos <= 0
              ? "no finish position after waiting (leave results screen so telemetry can finalize)"
              : "race still in progress when retries ran out",
        };
      }

      if (dryRun) {
        console.log("[dry-run] Would upload:", payload);
        return { dryRun: true, payload };
      }

      const result = await uploadSession(config, payload);
      return { uploaded: true, payload, result };
    } catch (err) {
      lastError = err;
      if (!isBusyError(err) || attempt === MAX_RETRIES) {
        throw err;
      }
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError ?? new Error("Failed to process telemetry file");
}

export function createWatcher(config, onEvent) {
  const seen = new Set(config.uploaded ?? []);
  const pending = new Map();
  const inFlight = new Set();

  async function handleFile(filePath) {
    const id = filePath.toLowerCase();
    if (seen.has(id) || inFlight.has(id)) {
      return { skipped: true, reason: seen.has(id) ? "already uploaded" : "already processing" };
    }
    inFlight.add(id);

    try {
      onEvent?.({
        type: "info",
        filePath,
        message: "Waiting for race results…",
      });
      const outcome = await processIbtFile(config, filePath);
      if (outcome.skipped) {
        onEvent?.({ type: "skip", filePath, ...outcome });
        if (/no finish position|still in progress|waiting/i.test(outcome.reason ?? "")) {
          return outcome;
        }
        seen.add(id);
        config.uploaded = [...seen].slice(-500);
        return outcome;
      }
      seen.add(id);
      config.uploaded = [...seen].slice(-500);
      onEvent?.({ type: "upload", filePath, ...outcome });
      return outcome;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onEvent?.({ type: "error", filePath, message });
      return { error: true, message };
    } finally {
      inFlight.delete(id);
    }
  }

  function schedule(filePath) {
    const key = filePath.toLowerCase();
    if (pending.has(key)) clearTimeout(pending.get(key));
    pending.set(
      key,
      setTimeout(() => {
        pending.delete(key);
        void handleFile(filePath);
      }, STABLE_MS),
    );
  }

  let watcher;
  try {
    watcher = watch(config.telemetryDir, (_, filename) => {
      if (!filename || !filename.toLowerCase().endsWith(".ibt")) return;
      schedule(join(config.telemetryDir, filename));
    });
  } catch (err) {
    onEvent?.({
      type: "error",
      message: `Cannot watch ${config.telemetryDir}: ${err}`,
    });
  }

  return {
    close() {
      watcher?.close();
      for (const t of pending.values()) clearTimeout(t);
    },
    /** Manually upload the newest .ibt (for races the watcher missed). */
    async uploadLatest() {
      const latest = listIbtFiles(config.telemetryDir)[0];
      if (!latest) {
        return { skipped: true, reason: "No .ibt files found" };
      }
      return handleFile(latest);
    },
  };
}
