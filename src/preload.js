const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  saveFileBuffer: (opts) => ipcRenderer.invoke('save-file-buffer', opts),
  openFile: () => ipcRenderer.invoke('open-file')
});
