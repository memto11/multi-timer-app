const { app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");


// только для разработки
if (!app.isPackaged) {
  require("electron-reload")(__dirname, {
    electron: require(`${__dirname}/node_modules/electron`)
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,

    minWidth: 400,
    minHeight: 500,

    resizable: true,
    autoHideMenuBar: true,

    icon: path.join(__dirname, "icon.ico"),

   webPreferences: {
  nodeIntegration: true,
  contextIsolation: false
}
  });

   mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
    // 🔥 автопроверка при запуске
  autoUpdater.checkForUpdates();

  // 🔧 логирование (по желанию)
  autoUpdater.autoDownload = false; // сначала спрашиваем пользователя

  // события обновлений
  autoUpdater.on("update-available", () => {
    mainWindow.webContents.send("update_available");
  });

  autoUpdater.on("update-not-available", () => {
    mainWindow.webContents.send("update_not_available");
  });

  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send("update_downloaded");
  });

  autoUpdater.on("error", (err) => {
    mainWindow.webContents.send("update_error", err.message);
  });
  
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("start_update", () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on("install_update", () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on("check_updates", () => {
  autoUpdater.checkForUpdates();
});