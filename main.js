const { app, BrowserWindow } = require("electron");
const path = require("path");

// только для разработки
if (!app.isPackaged) {
  require("electron-reload")(__dirname, {
    electron: require(`${__dirname}/node_modules/electron`)
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 700,

    minWidth: 400,
    minHeight: 500,

    resizable: true,
    autoHideMenuBar: true,

    icon: path.join(__dirname, "icon.ico"),

    webPreferences: {
      contextIsolation: true
    }
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

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