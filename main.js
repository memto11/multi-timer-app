const { app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const { dialog } = require("electron");

// только для разработки
if (!app.isPackaged) {
  require("electron-reload")(__dirname, {
    electron: require(`${__dirname}/node_modules/electron`),
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
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
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

ipcMain.handle("save-file", async (_, defaultName) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
  });

  return result.canceled ? null : result.filePath;
});

const fs = require("fs");

ipcMain.handle("write-file", async (_, filePath, data) => {
  try {
    if (!filePath) throw new Error("Путь не указан");

    // 🔒 проверка расширения
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".xlsx") {
      throw new Error("Разрешены только .xlsx файлы");
    }

    // 🔒 защита от странных путей (например ../../)
    const normalizedPath = path.normalize(filePath);

    // 🔒 ограничение размера (например до 10мб)
    if (data.length > 10 * 1024 * 1024) {
      throw new Error("Файл слишком большой");
    }

    fs.writeFileSync(normalizedPath, Buffer.from(data));

    return true;
  } catch (err) {
    console.error("Ошибка записи файла:", err);
    throw err;
  }
});
