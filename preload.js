const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveFile: (defaultName) => ipcRenderer.invoke("save-file", defaultName),

  writeFile: (filePath, data) =>
    ipcRenderer.invoke("write-file", filePath, data),

  startUpdate: () => ipcRenderer.send("start_update"),
  installUpdate: () => ipcRenderer.send("install_update"),
  checkUpdates: () => ipcRenderer.send("check_updates"),

  exitApp: () => ipcRenderer.send("exit_app"),

  onUpdateAvailable: (callback) => {
    const handler = (_, ...args) => callback(...args);
    ipcRenderer.on("update_available", handler);
    return () => ipcRenderer.removeListener("update_available", handler);
  },

  onUpdateNotAvailable: (callback) => {
    const handler = (_, ...args) => callback(...args);
    ipcRenderer.on("update_not_available", handler);
    return () => ipcRenderer.removeListener("update_not_available", handler);
  },

  onUpdateDownloaded: (callback) => {
    const handler = (_, ...args) => callback(...args);
    ipcRenderer.on("update_downloaded", handler);
    return () => ipcRenderer.removeListener("update_downloaded", handler);
  },

  onUpdateError: (callback) => {
    const handler = (_, ...args) => callback(...args);
    ipcRenderer.on("update_error", handler);
    return () => ipcRenderer.removeListener("update_error", handler);
  },
});
