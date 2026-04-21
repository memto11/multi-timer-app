const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveFile: (defaultName) => ipcRenderer.invoke("save-file", defaultName),

  writeFile: (filePath, data) => ipcRenderer.invoke("write-file", filePath, data),

  startUpdate: () => ipcRenderer.send("start_update"),
  installUpdate: () => ipcRenderer.send("install_update"),
  checkUpdates: () => ipcRenderer.send("check_updates"),

  onUpdateAvailable: (callback) => ipcRenderer.on("update_available", callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on("update_not_available", callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on("update_downloaded", callback),
  onUpdateError: (callback) => ipcRenderer.on("update_error", callback)
});

