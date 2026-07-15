import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("splitmeta", {
  getSession: () => ipcRenderer.invoke("get-session"),
  signIn: () => ipcRenderer.invoke("sign-in"),
  signOut: () => ipcRenderer.invoke("sign-out"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  pickTelemetryDir: () => ipcRenderer.invoke("pick-telemetry-dir"),
  toggleWatcher: () => ipcRenderer.invoke("toggle-watcher"),
  refreshSession: () => ipcRenderer.invoke("refresh-session"),
  onSessionUpdated: (callback) => {
    ipcRenderer.on("session-updated", (_event, session) => callback(session));
  },
});
