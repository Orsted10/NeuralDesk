const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aetheriaDesktop', {
  // ─── OS Commands ───────────────────────────────────────────────
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  getOsContext:   () => ipcRenderer.invoke('get-os-context'),

  // ─── Memory & Lexicon ──────────────────────────────────────────
  getLexicon:    () => ipcRenderer.invoke('get-lexicon'),
  getEpisodes:   (limit) => ipcRenderer.invoke('get-episodes', limit),
  searchContext: (query) => ipcRenderer.invoke('search-context', query),
  storeContext:  (fact)  => ipcRenderer.invoke('store-context', fact),

  // ─── WhatsApp ──────────────────────────────────────────────────
  whatsappReady:        () => ipcRenderer.invoke('whatsapp-ready'),
  getWhatsappQr:        () => ipcRenderer.invoke('whatsapp-get-qr'),
  getWhatsappContacts:  () => ipcRenderer.invoke('whatsapp-get-contacts'),
  getWhatsappRecentChats: () => ipcRenderer.invoke('whatsapp-get-recent-chats'),
  logoutWhatsapp:       () => ipcRenderer.invoke('whatsapp-logout'),
  sendWhatsappMessage:  (to, message) => ipcRenderer.invoke('whatsapp-send', { to, message }),
  readWhatsappMessages: (contactName) => ipcRenderer.invoke('whatsapp-read', contactName),

  // ─── UPI Payments (PIN-less via WhatsApp Deep Link) ────────────
  // Usage: sendUpiPayment("Rishi", 300, "Lunch")
  sendUpiPayment: (contactName, amount, note) =>
    ipcRenderer.invoke('whatsapp-upi-pay', { contactName, amount: String(amount), note }),

  // ─── Event Listeners (from main → renderer) ────────────────────
  onWhatsappMessage:    (cb) => ipcRenderer.on('whatsapp-message',    (_e, v) => cb(v)),
  onWhatsappQr:         (cb) => ipcRenderer.on('whatsapp-qr',         (_e, v) => cb(v)),
  onWhatsappReady:      (cb) => ipcRenderer.on('whatsapp-ready',      (_e, v) => cb(v)),
  onWhatsappDisconnect: (cb) => ipcRenderer.on('whatsapp-disconnected',(_e, v) => cb(v)),
  onClipboardError:     (cb) => ipcRenderer.on('clipboard-error',     (_e, v) => cb(v)),

  // ─── OS Hooks ──────────────────────────────────────────────────
  ghostType:      (text)    => ipcRenderer.invoke('ghost-type', text),
  suspendProcess: (proc)    => ipcRenderer.invoke('suspend-process', proc),
  flowStateActive:(data)    => ipcRenderer.invoke('flow-state-active', data),
});

// ─────────────────────────────────────────────────────────────────
// Typing Rhythm / Flow State Detection
// ─────────────────────────────────────────────────────────────────
let keyStrokes = [];
let flowStateActive = false;

window.addEventListener('keydown', (e) => {
  if (e.key.length > 1) return;
  const now = Date.now();
  keyStrokes.push(now);
  keyStrokes = keyStrokes.filter(t => now - t < 30000);

  if (keyStrokes.length > 150 && !flowStateActive) {
    const intervals = [];
    for (let i = 1; i < keyStrokes.length; i++) intervals.push(keyStrokes[i] - keyStrokes[i-1]);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;

    if (variance < 20000) {
      flowStateActive = true;
      ipcRenderer.invoke('flow-state-active', { cpm: keyStrokes.length * 2, variance });
      setTimeout(() => { flowStateActive = false; keyStrokes = []; }, 60000);
    }
  }
});
