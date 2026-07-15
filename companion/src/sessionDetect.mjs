import { execFile } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const IRACING_PROCESSES = [
  "iRacingSim64DX11.exe",
  "iRacingSim64.exe",
  "iRacingSim.exe",
];

function tasklistHas(imageName) {
  return new Promise((resolve) => {
    execFile(
      "tasklist",
      ["/FI", `IMAGENAME eq ${imageName}`, "/NH"],
      { windowsHide: true },
      (err, stdout) => {
        if (err) {
          resolve(false);
          return;
        }
        resolve(String(stdout || "").toLowerCase().includes(imageName.toLowerCase()));
      },
    );
  });
}

export async function isIRacingRunning() {
  for (const name of IRACING_PROCESSES) {
    if (await tasklistHas(name)) return true;
  }
  return false;
}

export function getRecentTelemetryActivity(telemetryDir, withinMs = 90_000) {
  if (!telemetryDir || !existsSync(telemetryDir)) {
    return { active: false, latestFile: null, latestSize: 0, latestMtime: 0 };
  }

  const now = Date.now();
  let latest = null;

  for (const name of readdirSync(telemetryDir)) {
    if (!name.toLowerCase().endsWith(".ibt")) continue;
    const filePath = join(telemetryDir, name);
    try {
      const st = statSync(filePath);
      if (!latest || st.mtimeMs > latest.mtimeMs) {
        latest = { filePath, size: st.size, mtimeMs: st.mtimeMs };
      }
    } catch {
      // ignore unreadable files
    }
  }

  if (!latest) {
    return { active: false, latestFile: null, latestSize: 0, latestMtime: 0 };
  }

  return {
    active: now - latest.mtimeMs <= withinMs,
    latestFile: latest.filePath,
    latestSize: latest.size,
    latestMtime: latest.mtimeMs,
  };
}

export async function detectActiveSession(telemetryDir) {
  const running = await isIRacingRunning();
  const tele = getRecentTelemetryActivity(telemetryDir);
  return {
    inSession: running || tele.active,
    iracingRunning: running,
    telemetryActive: tele.active,
    latestFile: tele.latestFile,
  };
}
