const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const https = require("https");
const path = require("path");

const devServerUrl = process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    width: display.workAreaSize.width,
    height: display.workAreaSize.height,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: "#020409",
    title: "Live Globe Screensaver",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.once("ready-to-show", () => win.show());
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "LiveGlobeScreensaver/0.1"
        }
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", reject);
    request.setTimeout(12000, () => {
      request.destroy(new Error("request timeout"));
    });
  });
}

ipcMain.handle("live-data:json", async (_event, url) => {
  const allowed = new URL(url);
  const allowedHosts = new Set([
    "earthquake.usgs.gov",
    "stat.ripe.net",
    "eonet.gsfc.nasa.gov",
    "opensky-network.org",
    "api.coingecko.com"
  ]);
  if (!allowedHosts.has(allowed.hostname)) {
    throw new Error("Host not allowed");
  }

  return getJson(url);
});

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register("Escape", () => app.quit());
  globalShortcut.register("CommandOrControl+Q", () => app.quit());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
