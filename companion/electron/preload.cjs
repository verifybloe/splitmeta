const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("splitmeta", {
  getSession: () => ipcRenderer.invoke("get-session"),
  signIn: () => ipcRenderer.invoke("sign-in"),
  signInWithEmail: (email, password) =>
    ipcRenderer.invoke("sign-in-email", { email, password }),
  signUpWithEmail: (email, password, name) =>
    ipcRenderer.invoke("sign-up-email", { email, password, name }),
  signOut: () => ipcRenderer.invoke("sign-out"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  pickTelemetryDir: () => ipcRenderer.invoke("pick-telemetry-dir"),
  toggleWatcher: () => ipcRenderer.invoke("toggle-watcher"),
  toggleAutoMode: () => ipcRenderer.invoke("toggle-auto-mode"),
  uploadLatest: () => ipcRenderer.invoke("upload-latest"),
  refreshSession: () => ipcRenderer.invoke("refresh-session"),
  getUpdateStatus: () => ipcRenderer.invoke("get-update-status"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onSessionUpdated: (callback) => {
    ipcRenderer.on("session-updated", (_event, session) => callback(session));
  },
  onUpdateStatus: (callback) => {
    ipcRenderer.on("update-status", (_event, status) => callback(status));
  },
});
