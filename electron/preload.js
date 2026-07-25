const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // We can expose OS level APIs here as needed for Category C integration
  getClipboard: () => ipcRenderer.invoke('get-clipboard'),
  lockScreen: () => ipcRenderer.invoke('lock-screen')
});
