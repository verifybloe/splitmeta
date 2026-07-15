import { readdirSync, statSync, existsSync, watch } from "node:fs";
import { join } from "node:path";
import { readSessionInfoYaml } from "./ibt.mjs";
import { parseSessionYaml } from "./sessionParse.mjs";
import { uploadSession } from "./upload.mjs";

// iRacing often keeps .ibt files locked for a bit after the session ends.
const STABLE_MS = 8000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 12;

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

  for (let i = 0; i < 20; i++) {
    if (!existsSync(filePath)) {
      await sleep(1000);
      continue;
    }

    const size = statSync(filePath).size;
    if (size > 0 && size === lastSize) {
      stableCount += 1;
      if (stableCount >= 2) return;
    } else {
      stableCount = 0;
      lastSize = size;
    }
    await sleep(1500);
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
      const payload = parseSessionYaml(yamlText, filePath);

      if (
        payload.sessionType &&
        !payload.sessionType.toLowerCase().includes("race")
      ) {
        return {
          skipped: true,
          reason: `not a race session (${payload.sessionType})`,
        };
      }

      if (payload.finishPos <= 0) {
        return { skipped: true, reason: "no finish position in telemetry" };
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

  async function handleFile(filePath) {
    const id = filePath.toLowerCase();
    if (seen.has(id)) return;

    try {
      const outcome = await processIbtFile(config, filePath);
      if (outcome.skipped) {
        onEvent?.({ type: "skip", filePath, ...outcome });
        return;
      }
      seen.add(id);
      config.uploaded = [...seen].slice(-500);
      onEvent?.({ type: "upload", filePath, ...outcome });
    } catch (err) {
      onEvent?.({
        type: "error",
        filePath,
        message: err instanceof Error ? err.message : String(err),
      });
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

  function scanExisting() {
    // Only look at brand-new files via fs.watch after start —
    // don't auto-process old races when clicking Start watching.
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

  scanExisting();

  return {
    close() {
      watcher?.close();
      for (const t of pending.values()) clearTimeout(t);
    },
  };
}
