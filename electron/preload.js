const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("liveData", {
  json: (url) => ipcRenderer.invoke("live-data:json", url)
});
