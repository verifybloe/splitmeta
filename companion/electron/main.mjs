import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PORT = 38491;
const DEFAULT_SITE = "https://www.splitmeta.net";
const APP_ICON = path.join(__dirname, "..", "assets", "icon.png");

let mainWindow = null;
let watcher = null;
let session = loadSession();

function uiPath(file) {
  return path.join(__dirname, "..", "ui", file);
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
    telemetryExists: existsSync(session.telemetryDir ?? ""),
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

function startWatcher() {
  if (!session || !isLoggedIn(session)) return;
  stopWatcher();

  const config = toWatcherConfig(session);

  watcher = createWatcher(config, (event) => {
    if (event.type === "upload") {
      session = applyWatcherState(session, config);
      session = pushActivity(session, {
        type: "upload",
        message: `Uploaded race → ${event.result?.fingerprint ?? "ok"}`,
      });
      saveSession(session);
    } else if (event.type === "skip") {
      session = pushActivity(session, {
        type: "skip",
        message: event.reason ?? "Skipped file",
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

  session = pushActivity(session, {
    type: "info",
    message: "Watching telemetry folder",
  });
  saveSession(session);
  broadcastState();
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

async function signIn() {
  const state = randomBytes(16).toString("hex");
  const site = session?.siteUrl ?? DEFAULT_SITE;
  const connectUrl = `${site}/companion/connect?port=${AUTH_PORT}&state=${state}`;

  const authPromise = waitForAuthCallback(state);
  await shell.openExternal(connectUrl);
  session = await authPromise;
  await validateSession();
  startWatcher();
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
  stopWatcher();
  clearSession();
  session = null;
  broadcastState();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 820,
    minHeight: 600,
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    show: false,
    title: "SplitMeta",
    icon: existsSync(APP_ICON) ? APP_ICON : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.loadFile(uiPath("index.html"));
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
    if (ok) {
      startWatcher();
    } else {
      clearSession();
      session = null;
    }
  }

  broadcastState();
});

app.on("window-all-closed", () => {
  stopWatcher();
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-session", async () => publicSession());

ipcMain.handle("sign-in", async () => {
  try {
    return { ok: true, session: await signIn() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sign in failed",
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
  stopWatcher();
  startWatcher();
  broadcastState();
  return session.telemetryDir;
});

ipcMain.handle("toggle-watcher", async () => {
  if (watcher) {
    stopWatcher();
    session = pushActivity(session, { type: "info", message: "Watcher paused" });
    saveSession(session);
  } else {
    startWatcher();
  }
  broadcastState();
  return Boolean(watcher);
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
