import {
  readdirSync,
  statSync,
  existsSync,
  watch,
  openSync,
  closeSync,
} from "node:fs";
import { join } from "node:path";
import { readSessionInfoYaml } from "./ibt.mjs";
import { parseSessionYaml } from "./sessionParse.mjs";
import { uploadSession } from "./upload.mjs";

// Wait for iRacing to finish writing, then for cool-down / finish data.
const STABLE_MS = 12000;
const RETRY_DELAY_MS = 8000;
const MAX_RESULT_RETRIES = 36; // ~5 minutes waiting for finish pos
const BUSY_DELAY_MS = 4000;
const MAX_BUSY_RETRIES = 90; // ~6 minutes waiting for file unlock
const DEFER_DELAY_MS = 20000;
const MAX_DEFERs = 10; // additional watcher passes after soft failure

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
    /EBUSY|resource busy|locked|sharing violation/i.test(message)
  );
}

function canOpenForRead(filePath) {
  try {
    const fd = openSync(filePath, "r");
    closeSync(fd);
    return true;
  } catch (err) {
    if (isBusyError(err)) return false;
    throw err;
  }
}

/** Wait until size is stable AND Windows will let us open the file for read. */
async function waitForFileReady(filePath) {
  let lastSize = -1;
  let stableCount = 0;

  for (let i = 0; i < 45; i++) {
    if (!existsSync(filePath)) {
      await sleep(1000);
      continue;
    }

    const size = statSync(filePath).size;
    if (size > 0 && size === lastSize) {
      stableCount += 1;
    } else {
      stableCount = 0;
      lastSize = size;
    }

    if (stableCount >= 3 && canOpenForRead(filePath)) {
      return;
    }

    await sleep(2000);
  }
}

async function withBusyRetry(fn, onBusy) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_BUSY_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isBusyError(err)) throw err;
      onBusy?.(attempt);
      if (attempt === MAX_BUSY_RETRIES) break;
      await sleep(BUSY_DELAY_MS);
    }
  }
  const busy = new Error(
    "Telemetry file still locked by iRacing after waiting — leave the sim/results screen and try Upload again.",
  );
  busy.code = "EBUSY";
  busy.cause = lastError;
  throw busy;
}

export function listIbtFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".ibt"))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

export async function processIbtFile(config, filePath, { dryRun = false, onProgress } = {}) {
  await waitForFileReady(filePath);

  let busyNoticeAt = 0;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RESULT_RETRIES; attempt++) {
    try {
      const yamlText = await withBusyRetry(
        () => readSessionInfoYaml(filePath),
        (busyAttempt) => {
          const now = Date.now();
          if (now - busyNoticeAt > 15000) {
            busyNoticeAt = now;
            onProgress?.(
              `iRacing still has the telemetry file locked — waiting to open (try ${busyAttempt}/${MAX_BUSY_RETRIES})…`,
            );
          }
        },
      );
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
        if (attempt < MAX_RESULT_RETRIES) {
          onProgress?.(
            attempt % 3 === 1
              ? "Waiting for race results… (leave the results screen if stuck)"
              : "Waiting for race results…",
          );
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        return {
          skipped: true,
          defer: true,
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
      if (isBusyError(err)) {
        return {
          skipped: true,
          defer: true,
          reason:
            err instanceof Error
              ? err.message
              : "Telemetry file still locked by iRacing — will retry",
        };
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Failed to process telemetry file");
}

export function createWatcher(config, onEvent) {
  const seen = new Set(config.uploaded ?? []);
  const pending = new Map();
  const inFlight = new Set();
  const deferCounts = new Map();

  async function handleFile(filePath) {
    const id = filePath.toLowerCase();
    if (seen.has(id) || inFlight.has(id)) {
      return {
        skipped: true,
        reason: seen.has(id) ? "already uploaded" : "already processing",
      };
    }
    inFlight.add(id);

    try {
      onEvent?.({
        type: "info",
        filePath,
        message: "Waiting for race results…",
      });
      const outcome = await processIbtFile(config, filePath, {
        onProgress: (message) => {
          onEvent?.({ type: "info", filePath, message });
        },
      });

      if (outcome.skipped) {
        onEvent?.({ type: "skip", filePath, ...outcome });

        const shouldDefer =
          outcome.defer ||
          /no finish position|still in progress|locked|EBUSY|waiting/i.test(
            outcome.reason ?? "",
          );

        if (shouldDefer) {
          const n = (deferCounts.get(id) ?? 0) + 1;
          if (n <= MAX_DEFERs) {
            deferCounts.set(id, n);
            onEvent?.({
              type: "info",
              filePath,
              message: `Will retry when the file is free (${n}/${MAX_DEFERs})…`,
            });
            schedule(filePath, DEFER_DELAY_MS);
            return outcome;
          }
        }

        // Permanent skip (practice, etc.) — don't keep hammering.
        if (!/no finish position|still in progress|locked|EBUSY/i.test(outcome.reason ?? "")) {
          seen.add(id);
          config.uploaded = [...seen].slice(-500);
        }
        return outcome;
      }

      deferCounts.delete(id);
      seen.add(id);
      config.uploaded = [...seen].slice(-500);
      onEvent?.({ type: "upload", filePath, ...outcome });
      return outcome;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isBusyError(err)) {
        const n = (deferCounts.get(id) ?? 0) + 1;
        if (n <= MAX_DEFERs) {
          deferCounts.set(id, n);
          onEvent?.({
            type: "info",
            filePath,
            message:
              "Telemetry locked by iRacing — retrying after you leave results…",
          });
          schedule(filePath, DEFER_DELAY_MS);
          return { deferred: true, message };
        }
      }
      onEvent?.({ type: "error", filePath, message });
      return { error: true, message };
    } finally {
      inFlight.delete(id);
    }
  }

  function schedule(filePath, delayMs = STABLE_MS) {
    const key = filePath.toLowerCase();
    if (pending.has(key)) clearTimeout(pending.get(key));
    pending.set(
      key,
      setTimeout(() => {
        pending.delete(key);
        void handleFile(filePath);
      }, delayMs),
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
      // Allow re-try of a previously soft-failed file.
      const id = latest.toLowerCase();
      deferCounts.delete(id);
      return handleFile(latest);
    },
  };
}
