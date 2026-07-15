import { app } from "electron";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;

let mainWindow = null;
let latestStatus = {
  status: "idle",
  currentVersion: "",
  version: null,
  percent: 0,
  message: "",
};

function send(channel, payload) {
  mainWindow?.webContents.send(channel, payload);
}

function setStatus(patch) {
  latestStatus = { ...latestStatus, ...patch };
  send("update-status", latestStatus);
  return latestStatus;
}

export function getUpdateStatus() {
  return latestStatus;
}

export function initAutoUpdater(win) {
  mainWindow = win;
  setStatus({
    status: "idle",
    currentVersion: app.getVersion(),
    version: null,
    percent: 0,
    message: "",
  });

  // Auto-update only works in the installed .exe, not during `npm start`.
  if (!app.isPackaged) {
    setStatus({
      status: "dev",
      message: "Updates check only in the installed app",
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    setStatus({ status: "checking", message: "Checking for updates…" });
  });

  autoUpdater.on("update-available", (info) => {
    setStatus({
      status: "available",
      version: info.version,
      message: `Update ${info.version} available — downloading…`,
    });
  });

  autoUpdater.on("update-not-available", () => {
    setStatus({
      status: "up-to-date",
      message: "You're on the latest version",
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    setStatus({
      status: "downloading",
      percent: Math.round(progress.percent ?? 0),
      message: `Downloading update… ${Math.round(progress.percent ?? 0)}%`,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    setStatus({
      status: "ready",
      version: info.version,
      percent: 100,
      message: `Update ${info.version} ready — restart to install`,
    });
  });

  autoUpdater.on("error", (err) => {
    setStatus({
      status: "error",
      message: err?.message ?? "Update check failed",
    });
  });

  void autoUpdater.checkForUpdates().catch((err) => {
    setStatus({
      status: "error",
      message: err?.message ?? "Update check failed",
    });
  });
}

export async function installUpdateNow() {
  if (latestStatus.status !== "ready") {
    throw new Error("No update ready to install");
  }
  autoUpdater.quitAndInstall(false, true);
}

export async function checkForUpdatesNow() {
  if (!app.isPackaged) {
    return setStatus({
      status: "dev",
      message: "Updates check only in the installed app",
    });
  }
  setStatus({ status: "checking", message: "Checking for updates…" });
  await autoUpdater.checkForUpdates();
  return latestStatus;
}
