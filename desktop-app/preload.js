const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aetheriaDesktop', {
  // Execute a command on the local OS
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  getOsContext: () => ipcRenderer.invoke('get-os-context'),
  
  // Memory and Lexicon
  getLexicon: () => ipcRenderer.invoke('get-lexicon'),
  getEpisodes: (limit) => ipcRenderer.invoke('get-episodes', limit),
  searchContext: (query) => ipcRenderer.invoke('search-context', query),
  storeContext: (fact) => ipcRenderer.invoke('store-context', fact),
  
  // WhatsApp automation
  whatsappReady: () => ipcRenderer.invoke('whatsapp-ready'),
  getWhatsappQr: () => ipcRenderer.invoke('whatsapp-get-qr'),
  getWhatsappContacts: () => ipcRenderer.invoke('whatsapp-get-contacts'),
  logoutWhatsapp: () => ipcRenderer.invoke('whatsapp-logout'),
  sendWhatsappMessage: (to, message) => ipcRenderer.invoke('whatsapp-send', { to, message }),
  readWhatsappMessages: (contactName) => ipcRenderer.invoke('whatsapp-read', contactName),
  
  // Listen for WhatsApp messages coming from the background
  onWhatsappMessage: (callback) => ipcRenderer.on('whatsapp-message', (_event, value) => callback(value)),
  
  // Listen for WhatsApp QR code for initial login
  onWhatsappQr: (callback) => ipcRenderer.on('whatsapp-qr', (_event, value) => callback(value)),
  
  // AetheriaCompute: Listen for background clipboard error detections
  onClipboardError: (callback) => ipcRenderer.on('clipboard-error', (_event, value) => callback(value)),

  // Category C: OS Hooks
  ghostType: (text) => ipcRenderer.invoke('ghost-type', text),
  suspendProcess: (proc) => ipcRenderer.invoke('suspend-process', proc)
});

// Typing Rhythm Fingerprinting (Feature 21)
let keyStrokes = [];
let flowStateActive = false;

window.addEventListener('keydown', (e) => {
  // Ignore modifier keys
  if (e.key.length > 1) return;
  
  const now = Date.now();
  keyStrokes.push(now);
  
  // Keep last 30 seconds of strokes
  keyStrokes = keyStrokes.filter(t => now - t < 30000);
  
  if (keyStrokes.length > 150 && !flowStateActive) { // ~300 CPM threshold over 30s
    // Calculate variance
    const intervals = [];
    for (let i = 1; i < keyStrokes.length; i++) {
      intervals.push(keyStrokes[i] - keyStrokes[i-1]);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    
    // Low variance = rhythm = flow state
    if (variance < 20000) { 
      flowStateActive = true;
      ipcRenderer.invoke('flow-state-active', { cpm: keyStrokes.length * 2, variance });
      
      // Reset after 1 minute
      setTimeout(() => {
        flowStateActive = false;
        keyStrokes = [];
      }, 60000);
    }
  }
});
