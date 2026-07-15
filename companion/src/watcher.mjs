import { readdirSync, statSync, existsSync, watch } from "node:fs";
import { join } from "node:path";
import { readSessionInfoYaml } from "./ibt.mjs";
import { parseSessionYaml } from "./sessionParse.mjs";
import { uploadSession } from "./upload.mjs";

const STABLE_MS = 3000;

export function listIbtFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".ibt"))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

export async function processIbtFile(config, filePath, { dryRun = false } = {}) {
  const yamlText = readSessionInfoYaml(filePath);
  const payload = parseSessionYaml(yamlText, filePath);

  if (
    payload.sessionType &&
    !payload.sessionType.toLowerCase().includes("race")
  ) {
    return { skipped: true, reason: `not a race session (${payload.sessionType})` };
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
    for (const file of listIbtFiles(config.telemetryDir).slice(0, 3)) {
      schedule(file);
    }
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
