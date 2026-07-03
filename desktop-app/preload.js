const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisDesktop', {
  // Execute a command on the local OS
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  getOsContext: () => ipcRenderer.invoke('get-os-context'),
  
  // WhatsApp automation
  whatsappReady: () => ipcRenderer.invoke('whatsapp-ready'),
  sendWhatsappMessage: (to, message) => ipcRenderer.invoke('whatsapp-send', { to, message }),
  readWhatsappMessages: (contactName) => ipcRenderer.invoke('whatsapp-read', contactName),
  
  // Listen for WhatsApp messages coming from the background
  onWhatsappMessage: (callback) => ipcRenderer.on('whatsapp-message', (_event, value) => callback(value)),
  
  // Listen for WhatsApp QR code for initial login
  onWhatsappQr: (callback) => ipcRenderer.on('whatsapp-qr', (_event, value) => callback(value))
});
