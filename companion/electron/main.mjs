import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain, shell, dialog, nativeImage } from "electron";
import {
  loadSession,
  saveSession,
  clearSession,
  isLoggedIn,
  pushActivity,
  toWatcherConfig,
  applyWatcherState,
  defaultSession,
} from "../src/session.mjs";
import { createWatcher } from "../src/watcher.mjs";
import { detectActiveSession } from "../src/sessionDetect.mjs";
import {
  initAutoUpdater,
  getUpdateStatus,
  checkForUpdatesNow,
  installUpdateNow,
} from "./updater.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PORT = 38491;
const DEFAULT_SITE = "https://www.splitmeta.net";
const AUTO_POLL_MS = 5000;

let mainWindow = null;
let watcher = null;
let session = loadSession();
let autoTimer = null;
let autoBusy = false;
let lastAutoState = "";
/** After an auto upload, stay paused until iRacing exits or a new .ibt appears. */
let autoArmed = true;
let lastAutoUploadedFile = null;

function appRoot() {
  return app.getAppPath();
}

function uiPath(file) {
  return path.join(appRoot(), "ui", file);
}

function iconPath() {
  const ico = path.join(appRoot(), "assets", "icon.ico");
  if (existsSync(ico)) return ico;
  return path.join(appRoot(), "assets", "icon.png");
}

function getAppIcon() {
  const file = iconPath();
  if (!existsSync(file)) return undefined;
  const image = nativeImage.createFromPath(file);
  return image.isEmpty() ? undefined : image;
}

function send(channel, payload) {
  mainWindow?.webContents.send(channel, payload);
}

function broadcastState() {
  send("session-updated", publicSession());
}

function publicSession() {
  if (!session || !isLoggedIn(session)) return null;
  return {
    email: session.email,
    name: session.name,
    plan: session.plan,
    siteUrl: session.siteUrl,
    telemetryDir: session.telemetryDir,
    activity: session.activity ?? [],
    watching: Boolean(watcher),
    autoMode: Boolean(session.autoMode),
    autoLabel: lastAutoState,
    latestBriefing: session.latestBriefing ?? null,
    telemetryExists: existsSync(session.telemetryDir ?? ""),
    appVersion: app.getVersion(),
  };
}

async function validateSession() {
  if (!session || !isLoggedIn(session)) return false;
  try {
    const res = await fetch(`${session.siteUrl}/api/companion/session`, {
      headers: { Authorization: `Bearer ${session.companionToken}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    session.email = data.user.email;
    session.name = data.user.name ?? session.name;
    session.plan = data.user.plan;
    session.uploadCount = data.uploads;
    saveSession(session);
    return true;
  } catch {
    return false;
  }
}

function stopWatcher() {
  watcher?.close();
  watcher = null;
}

function stopAutoLoop() {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

function startWatcher({ quiet = false } = {}) {
  if (!session || !isLoggedIn(session)) return;
  if (watcher) return;

  const config = toWatcherConfig(session);

  watcher = createWatcher(config, (event) => {
    if (event.type === "upload") {
      session = applyWatcherState(session, config);
      if (event.result?.briefing) {
        session.latestBriefing = event.result.briefing;
      }
      const fp = event.result?.fingerprint ?? "ok";
      const brief = event.result?.briefing;
      session = pushActivity(session, {
        type: "upload",
        message: brief?.headline
          ? `Uploaded → ${fp} · ${brief.headline}`
          : `Uploaded race → ${fp}`,
      });
      if (brief?.summary) {
        session = pushActivity(session, {
          type: "info",
          message: brief.summary,
        });
      }
      saveSession(session);

      // Auto mode: job done → pause until next session/file.
      if (session.autoMode) {
        stopWatcher();
        autoArmed = false;
        lastAutoUploadedFile = event.filePath ?? lastAutoUploadedFile;
        lastAutoState = "Upload done — waiting for next session";
        session = pushActivity(session, {
          type: "info",
          message: "Auto: paused after upload",
        });
        saveSession(session);
      }
    } else if (event.type === "skip") {
      session = pushActivity(session, {
        type: "skip",
        message: event.reason ?? "Skipped file",
      });
      saveSession(session);
    } else if (event.type === "info") {
      session = pushActivity(session, {
        type: "info",
        message: event.message ?? "Working…",
      });
      saveSession(session);
    } else if (event.type === "error") {
      session = pushActivity(session, {
        type: "error",
        message: event.message ?? "Upload error",
      });
      saveSession(session);
    }
    broadcastState();
  });

  if (!quiet) {
    session = pushActivity(session, {
      type: "info",
      message: session.autoMode
        ? "Auto: watching this session"
        : "Watching telemetry folder",
    });
    saveSession(session);
  }
  broadcastState();
}

async function tickAutoMode() {
  if (!session?.autoMode || !isLoggedIn(session) || autoBusy) return;
  autoBusy = true;
  try {
    const detected = await detectActiveSession(session.telemetryDir);

    if (!autoArmed) {
      const newFile =
        detected.latestFile &&
        detected.latestFile !== lastAutoUploadedFile;
      if (!detected.iracingRunning || newFile) {
        autoArmed = true;
        lastAutoState = "Waiting for iRacing session";
      } else {
        lastAutoState = "Upload done — waiting for next session";
        broadcastState();
        return;
      }
    }

    if (detected.inSession) {
      lastAutoState = detected.iracingRunning
        ? "iRacing detected — watching"
        : "Telemetry activity — watching";
      if (!watcher) {
        startWatcher({ quiet: false });
      } else {
        broadcastState();
      }
    } else {
      lastAutoState = "Waiting for iRacing session";
      broadcastState();
    }
  } finally {
    autoBusy = false;
  }
}

function startAutoLoop() {
  stopAutoLoop();
  if (!session?.autoMode) return;
  autoArmed = true;
  lastAutoState = "Waiting for iRacing session";
  void tickAutoMode();
  autoTimer = setInterval(() => {
    void tickAutoMode();
  }, AUTO_POLL_MS);
  broadcastState();
}

function setAutoMode(enabled) {
  if (!session) return false;
  session.autoMode = Boolean(enabled);
  if (session.autoMode) {
    session = pushActivity(session, {
      type: "info",
      message: "Auto mode on — will start when a session is detected",
    });
    saveSession(session);
    startAutoLoop();
  } else {
    stopAutoLoop();
    lastAutoState = "";
    autoArmed = true;
    session = pushActivity(session, {
      type: "info",
      message: "Auto mode off",
    });
    saveSession(session);
    broadcastState();
  }
  return session.autoMode;
}

function waitForAuthCallback(expectedState) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? "/", `http://127.0.0.1:${AUTH_PORT}`);
        if (url.pathname !== "/callback") {
          res.writeHead(404);
          res.end();
          return;
        }

        if (url.searchParams.get("state") !== expectedState) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>State mismatch</h1><p>Try signing in again from the app.</p>");
          server.close();
          reject(new Error("State mismatch"));
          return;
        }

        const next = {
          ...defaultSession(),
          siteUrl: url.searchParams.get("siteUrl") || DEFAULT_SITE,
          companionToken: url.searchParams.get("companionToken") ?? "",
          apiKey: url.searchParams.get("apiKey") ?? "",
          email: url.searchParams.get("email") ?? "",
          name: url.searchParams.get("name") ?? "",
          plan: url.searchParams.get("plan") ?? "FREE",
          telemetryDir: session?.telemetryDir ?? defaultSession().telemetryDir,
          uploaded: session?.uploaded ?? [],
          activity: [],
          autoMode: session?.autoMode ?? false,
        };

        if (!isLoggedIn(next)) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>Connect failed</h1>");
          server.close();
          reject(new Error("Invalid connect payload"));
          return;
        }

        session = pushActivity(next, {
          type: "info",
          message: `Signed in as ${next.email}`,
        });
        saveSession(session);
        if (session.autoMode) startAutoLoop();

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body style='font-family:sans-serif;background:#0a0a0a;color:#fff;text-align:center;padding:48px'><h1>Connected!</h1><p>You can close this tab and return to SplitMeta.</p></body></html>",
        );
        server.close();
        resolve(session);
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    server.on("error", reject);
    server.listen(AUTH_PORT, "127.0.0.1");
  });
}

async function finishLoginFromCredentials(creds) {
  const next = {
    ...defaultSession(),
    siteUrl: creds.siteUrl || DEFAULT_SITE,
    companionToken: creds.companionToken ?? "",
    apiKey: creds.apiKey ?? "",
    email: creds.email ?? "",
    name: creds.name ?? "",
    plan: creds.plan ?? "FREE",
    telemetryDir: session?.telemetryDir ?? defaultSession().telemetryDir,
    uploaded: session?.uploaded ?? [],
    activity: [],
    autoMode: session?.autoMode ?? false,
  };

  if (!isLoggedIn(next)) {
    throw new Error("Invalid login response");
  }

  session = pushActivity(next, {
    type: "info",
    message: `Signed in as ${next.email}`,
  });
  saveSession(session);
  await validateSession();
  if (session.autoMode) startAutoLoop();
  broadcastState();
  return publicSession();
}

async function signInWithEmail(email, password) {
  const site = session?.siteUrl ?? DEFAULT_SITE;
  const res = await fetch(`${site}/api/companion/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Sign in failed");
  }
  return finishLoginFromCredentials(data);
}

async function signUpWithEmail(email, password, name) {
  const site = session?.siteUrl ?? DEFAULT_SITE;
  const res = await fetch(`${site}/api/companion/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Registration failed");
  }
  return finishLoginFromCredentials(data);
}

async function signInGoogle() {
  const state = randomBytes(16).toString("hex");
  const site = session?.siteUrl ?? DEFAULT_SITE;
  const connectUrl = `${site}/companion/connect?port=${AUTH_PORT}&state=${state}`;

  const authPromise = waitForAuthCallback(state);
  await shell.openExternal(connectUrl);
  session = await authPromise;
  await validateSession();
  broadcastState();
  return publicSession();
}

async function signOut() {
  if (session?.companionToken) {
    try {
      await fetch(`${session.siteUrl}/api/companion/session`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.companionToken}` },
      });
    } catch {
      // ignore network errors on sign out
    }
  }
  stopAutoLoop();
  stopWatcher();
  lastAutoState = "";
  clearSession();
  session = null;
  broadcastState();
}

function createWindow() {
  // Use a normal Windows frame for reliability. The in-app titlebar still
  // hosts brand + account; titleBarOverlay left some installs stuck hidden
  // after the v0.3.7 update (ready-to-show never fired).
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 820,
    minHeight: 600,
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    show: false,
    title: "SplitMeta",
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, desc, url) => {
    console.error("Load failed:", code, desc, url);
    revealWindow();
  });

  mainWindow.webContents.on("preload-error", (_event, preloadPath, err) => {
    console.error("Preload error:", preloadPath, err);
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("Renderer gone:", details);
    revealWindow();
  });

  let shown = false;
  function revealWindow() {
    if (shown || !mainWindow || mainWindow.isDestroyed()) return;
    shown = true;
    mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }

  mainWindow.once("ready-to-show", revealWindow);
  // Safety net so updates never leave a stuck hidden process.
  setTimeout(revealWindow, 2000);

  mainWindow.loadFile(uiPath("index.html")).catch((err) => {
    console.error("loadFile failed:", err);
    revealWindow();
  });

  mainWindow.webContents.once("did-finish-load", () => {
    revealWindow();
    initAutoUpdater(mainWindow);
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

if (process.platform === "win32") {
  app.setAppUserModelId("net.splitmeta.app");
}

app.whenReady().then(async () => {
  if (!gotLock) return;
  createWindow();

  if (session && isLoggedIn(session)) {
    const ok = await validateSession();
    if (!ok) {
      clearSession();
      session = null;
    } else if (session.autoMode) {
      startAutoLoop();
    }
  }

  broadcastState();
});

app.on("window-all-closed", () => {
  stopAutoLoop();
  stopWatcher();
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-session", async () => publicSession());

ipcMain.handle("sign-in", async () => {
  try {
    return { ok: true, session: await signInGoogle() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sign in failed",
    };
  }
});

ipcMain.handle("sign-in-email", async (_event, { email, password }) => {
  try {
    return { ok: true, session: await signInWithEmail(email, password) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sign in failed",
    };
  }
});

ipcMain.handle("sign-up-email", async (_event, { email, password, name }) => {
  try {
    return { ok: true, session: await signUpWithEmail(email, password, name) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Registration failed",
    };
  }
});

ipcMain.handle("sign-out", async () => {
  await signOut();
  return { ok: true };
});

ipcMain.handle("open-external", async (_event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle("pick-telemetry-dir", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select iRacing telemetry folder",
  });
  if (result.canceled || !result.filePaths[0]) return null;
  if (!session) return null;
  session.telemetryDir = result.filePaths[0];
  saveSession(session);
  broadcastState();
  return session.telemetryDir;
});

ipcMain.handle("upload-latest", async () => {
  if (!session || !isLoggedIn(session)) {
    return { ok: false, error: "Sign in first" };
  }
  try {
    if (watcher?.uploadLatest) {
      const outcome = await watcher.uploadLatest();
      if (outcome?.uploaded) {
        // handleFile already pushed briefing via onEvent
        broadcastState();
        return { ok: true, briefing: session.latestBriefing ?? null };
      }
      if (outcome?.deferred || outcome?.defer) {
        broadcastState();
        return {
          ok: true,
          pending: true,
          message:
            outcome.reason ??
            outcome.message ??
            "Waiting for iRacing to release the telemetry file…",
        };
      }
      return {
        ok: false,
        error: outcome?.reason ?? outcome?.message ?? "Upload failed",
      };
    }

    const { listIbtFiles, processIbtFile } = await import("../src/watcher.mjs");
    const config = toWatcherConfig(session);
    const latest = listIbtFiles(config.telemetryDir)[0];
    if (!latest) {
      return { ok: false, error: "No .ibt files found" };
    }
    session = pushActivity(session, {
      type: "info",
      message: "Uploading latest race…",
    });
    saveSession(session);
    broadcastState();

    const outcome = await processIbtFile(config, latest, {
      onProgress: (message) => {
        session = pushActivity(session, { type: "info", message });
        saveSession(session);
        broadcastState();
      },
    });
    if (outcome.uploaded) {
      session = applyWatcherState(session, config);
      if (outcome.result?.briefing) {
        session.latestBriefing = outcome.result.briefing;
      }
      const fp = outcome.result?.fingerprint ?? "ok";
      const brief = outcome.result?.briefing;
      session = pushActivity(session, {
        type: "upload",
        message: brief?.headline
          ? `Uploaded → ${fp} · ${brief.headline}`
          : `Uploaded race → ${fp}`,
      });
      if (brief?.summary) {
        session = pushActivity(session, {
          type: "info",
          message: brief.summary,
        });
      }
      saveSession(session);
      broadcastState();
      return { ok: true };
    }
    session = pushActivity(session, {
      type: outcome.defer ? "info" : "skip",
      message: outcome.reason ?? "Skipped",
    });
    saveSession(session);
    broadcastState();
    return {
      ok: Boolean(outcome.defer),
      pending: Boolean(outcome.defer),
      error: outcome.defer ? undefined : outcome.reason ?? "Upload skipped",
      message: outcome.reason,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const busy =
      err?.code === "EBUSY" ||
      /EBUSY|resource busy|locked/i.test(message);
    session = pushActivity(session, {
      type: busy ? "info" : "error",
      message: busy
        ? "Telemetry locked by iRacing — leave results and try Upload again."
        : message,
    });
    saveSession(session);
    broadcastState();
    return { ok: false, error: message };
  }
});

ipcMain.handle("dismiss-briefing", async () => {
  if (!session) return null;
  session.latestBriefing = null;
  saveSession(session);
  broadcastState();
  return publicSession();
});

ipcMain.handle("toggle-watcher", async () => {
  if (watcher) {
    stopWatcher();
    if (session?.autoMode) {
      setAutoMode(false);
    } else {
      session = pushActivity(session, { type: "info", message: "Watcher paused" });
      saveSession(session);
      broadcastState();
    }
  } else {
    // Manual start — leave Auto as-is but run watcher now.
    startWatcher();
  }
  broadcastState();
  return Boolean(watcher);
});

ipcMain.handle("toggle-auto-mode", async () => {
  if (!session || !isLoggedIn(session)) return false;
  const next = !session.autoMode;
  if (next && watcher) {
    // Switching to Auto while already watching is fine — keep watcher.
  }
  if (!next && watcher) {
    // Turning Auto off does not force-pause; user still has manual control.
  }
  return setAutoMode(next);
});

ipcMain.handle("refresh-session", async () => {
  const ok = await validateSession();
  if (!ok) {
    await signOut();
    return null;
  }
  broadcastState();
  return publicSession();
});

ipcMain.handle("get-update-status", async () => getUpdateStatus());

ipcMain.handle("check-for-updates", async () => {
  try {
    return { ok: true, status: await checkForUpdatesNow() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Update check failed",
    };
  }
});

ipcMain.handle("install-update", async () => {
  try {
    await installUpdateNow();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Install failed",
    };
  }
});
