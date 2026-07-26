const { app, BrowserWindow, ipcMain, session, clipboard, Notification } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const os = require('os');
const fs = require('fs');
const memoryDB = require('./memory_db');

// --- Local Server Bridge ---
const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());

expressApp.get('/ping', (req, res) => res.json({ alive: true }));

expressApp.post('/api/whatsapp/send', async (req, res) => {
  if (!whatsappReady || !whatsappClient) return res.status(503).json({ error: 'WhatsApp not ready' });
  const { to, message } = req.body;
  try {
    let targetId = to;
    if (!/^\+?\d+$/.test(to.replace(/[-\s()]/g, ''))) {
      const s = to.toLowerCase();
      if (s.includes('myself') || s === 'me') { targetId = whatsappClient.info.wid._serialized; }
      else {
        const contacts = await whatsappClient.getContacts();
        const contact = contacts.find(c => (c.name || c.pushname || '').toLowerCase().includes(s));
        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        targetId = contact.id._serialized;
      }
    } else { targetId = to.replace(/[-\s()]/g, '') + '@c.us'; }
    await whatsappClient.sendMessage(targetId, message);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

expressApp.get('/api/whatsapp/chats', async (req, res) => {
  if (!whatsappReady || !whatsappClient) return res.status(503).json({ error: 'WhatsApp not ready' });
  try {
    const chats = await whatsappClient.getChats();
    const recent = chats.filter(c => !c.isGroup).slice(0, 30);
    const results = await Promise.allSettled(
      recent.map(async (chat) => {
        const fetchPromise = chat.fetchMessages({ limit: 1 });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
        const msgs = await Promise.race([fetchPromise, timeoutPromise]);
        if (msgs.length === 0) return null;
        const lastMsg = msgs[msgs.length - 1];
        return {
          sender: chat.name || chat.id.user,
          body: lastMsg.body || (lastMsg.hasMedia ? '[Media]' : '[Message]'),
          timestamp: new Date(lastMsg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: chat.unreadCount || 0
        };
      })
    );
    const messages = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    res.json({ success: true, messages });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

expressApp.listen(3333, () => console.log('Local Bridge running on port 3333'));
// ---------------------------

// Safe require for optional native modules
let activeWin;
try { activeWin = require('active-win'); } catch(e) { console.warn('[WARN] active-win not available:', e.message); }

// Auto-updater (safe — won't crash in dev mode)
let autoUpdater;
try {
  const updater = require('electron-updater');
  autoUpdater = updater.autoUpdater;
} catch(e) { console.warn('[INFO] electron-updater not installed. Skipping auto-update.'); }

// ─────────────────────────────────────────────
// PRODUCTION URL — aetheriacompute.me
// ─────────────────────────────────────────────
const PROD_URL = 'https://aetheriacompute.me';
const DEV_URL  = 'http://localhost:3000';

function getChromeExecutablePath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let mainWindow;
let splashWindow;
let whatsappClient;
let voiceEngineProcess;
let currentWhatsappQr = null;
let whatsappReady = false;

// ─────────────────────────────────────────────
// SPLASH SCREEN
// ─────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { nodeIntegration: false }
  });

  const splashHtml = `<!DOCTYPE html><html><head><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background: linear-gradient(135deg, #0a0a1a, #1a0a2e); display:flex; flex-direction:column;
      align-items:center; justify-content:center; height:100vh; font-family:'Segoe UI',sans-serif;
      color:white; border-radius:16px; -webkit-app-region:drag; }
    .logo { font-size:3rem; font-weight:900; letter-spacing:-2px;
      background:linear-gradient(90deg,#a78bfa,#60a5fa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .sub { font-size:0.8rem; color:#888; margin-top:6px; letter-spacing:4px; text-transform:uppercase; }
    .bar { margin-top:32px; width:200px; height:2px; background:#222; border-radius:999px; overflow:hidden; }
    .fill { height:100%; width:0%; background:linear-gradient(90deg,#a78bfa,#60a5fa);
      animation:load 2.5s ease-in-out forwards; border-radius:999px; }
    @keyframes load { from{width:0%} to{width:100%} }
  </style></head><body>
    <div class="logo">Aetheria</div>
    <div class="sub">Ambient Compute Engine</div>
    <div class="bar"><div class="fill"></div></div>
  </body></html>`;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));
}

// ─────────────────────────────────────────────
// MAIN WINDOW
// ─────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const url = process.env.NODE_ENV === 'development' ? DEV_URL : PROD_URL;
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) { splashWindow.close(); splashWindow = null; }
    mainWindow.show();
    if (autoUpdater) autoUpdater.checkForUpdatesAndNotify();
  });
}

// ─────────────────────────────────────────────
// WHATSAPP
// ─────────────────────────────────────────────
function initializeWhatsApp() {
  const executablePath = getChromeExecutablePath();
  const puppeteerOptions = { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] };
  if (executablePath) puppeteerOptions.executablePath = executablePath;

  whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(app.getPath('userData'), '.wwebjs_auth') }),
    puppeteer: puppeteerOptions
  });

  whatsappClient.on('qr', (qr) => {
    console.log('[WhatsApp] QR received.');
    currentWhatsappQr = qr;
    if (mainWindow) mainWindow.webContents.send('whatsapp-qr', qr);
  });

  whatsappClient.on('ready', () => {
    console.log('[WhatsApp] Client ready!');
    whatsappReady = true;
    currentWhatsappQr = null;
    const myNumber = whatsappClient.info && whatsappClient.info.wid ? whatsappClient.info.wid.user : null;
    if (mainWindow) mainWindow.webContents.send('whatsapp-ready', { myNumber });
  });

  whatsappClient.on('disconnected', (reason) => {
    console.warn('[WhatsApp] Disconnected:', reason);
    whatsappReady = false;
    if (mainWindow) mainWindow.webContents.send('whatsapp-disconnected', reason);
  });

  whatsappClient.on('message', message => {
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp-message', {
        from: message.from, body: message.body,
        notifyName: (message._data && message._data.notifyName) || 'Unknown'
      });
    }
    updateLexicon(message.body);
  });

  whatsappClient.initialize();
}

// ─────────────────────────────────────────────
// UPI PAYMENT via WhatsApp Deep Link (UPI Lite)
// ─────────────────────────────────────────────
ipcMain.handle('whatsapp-upi-pay', async (event, { contactName, amount, note }) => {
  if (!whatsappClient || !whatsappReady) {
    return { success: false, error: 'WhatsApp is not connected. Please scan the QR code first.' };
  }
  try {
    const contacts = await whatsappClient.getContacts();
    const contact = contacts.find(c => {
      const name = (c.name || c.pushname || '').toLowerCase();
      return name.includes(contactName.toLowerCase());
    });
    if (!contact) return { success: false, error: `Contact "${contactName}" not found in WhatsApp.` };

    const upiDeepLink = `upi://pay?pa=${contact.number}@ybl&pn=${encodeURIComponent(contact.name || contactName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note || 'Payment via Aetheria')}`;
    const message = `\u{1F4B8} *Aetheria Payment*\n\nHey ${contact.name || contactName}! Here is a payment of \u20B9${amount} for "${note || 'Payment'}".\n\nTap below to pay instantly (UPI Lite \u2014 no PIN needed \u2264 \u20B9500):\n\n${upiDeepLink}\n\n_Sent by AetheriaCompute_`;

    await whatsappClient.sendMessage(contact.id._serialized, message);
    return { success: true, message: `UPI link sent to ${contact.name || contactName}!` };
  } catch (error) {
    console.error('[UPI Pay Error]', error);
    return { success: false, error: error.message };
  }
});

// ─────────────────────────────────────────────
// LEXICON
// ─────────────────────────────────────────────
function updateLexicon(text) {
  if (!text) return;
  const lexiconPath = path.join(app.getPath('userData'), 'lexicon.json');
  let lexicon = {};
  if (fs.existsSync(lexiconPath)) { try { lexicon = JSON.parse(fs.readFileSync(lexiconPath, 'utf8')); } catch(e){} }
  text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).forEach(word => {
    if (word.length > 3) lexicon[word] = (lexicon[word] || 0) + 1;
  });
  fs.writeFileSync(lexiconPath, JSON.stringify(lexicon, null, 2));
}

ipcMain.handle('get-lexicon', async () => {
  const lexiconPath = path.join(app.getPath('userData'), 'lexicon.json');
  if (!fs.existsSync(lexiconPath)) return [];
  try {
    const lexicon = JSON.parse(fs.readFileSync(lexiconPath, 'utf8'));
    return Object.entries(lexicon).sort((a, b) => b[1] - a[1]).slice(0, 15).map(e => e[0]);
  } catch(e) { return []; }
});

// ─────────────────────────────────────────────
// MEMORY / CONTEXT GRAPH
// ─────────────────────────────────────────────
ipcMain.handle('store-context', async (event, { subject, predicate, object }) => { memoryDB.logContext(subject, predicate, object); return true; });
ipcMain.handle('search-context', async (event, query) => memoryDB.searchContext(query));
ipcMain.handle('get-episodes', async (event, limit) => memoryDB.getRecentEpisodes(limit));

// ─────────────────────────────────────────────
// VOICE ENGINE
// ─────────────────────────────────────────────
function startVoiceEngine() {
  const spawnEngine = () => {
    if (app.isPackaged) {
      const exePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', 'voice_engine.exe');
      voiceEngineProcess = spawn(exePath);
    } else {
      const pyPath = path.join(__dirname, 'voice_engine.py');
      if (!fs.existsSync(pyPath)) { console.warn('[Voice] voice_engine.py not found, skipping.'); return; }
      voiceEngineProcess = spawn('python', [pyPath]);
    }
    voiceEngineProcess.stdout.on('data', d => console.log(`[Voice] ${d}`));
    voiceEngineProcess.stderr.on('data', d => console.error(`[Voice ERR] ${d}`));
  };
  if (process.platform === 'win32') { exec('taskkill /F /IM voice_engine.exe', () => spawnEngine()); } else { spawnEngine(); }
}

// ─────────────────────────────────────────────
// CLIPBOARD MONITOR
// ─────────────────────────────────────────────
let lastClipboardText = '';
function startClipboardMonitor() {
  setInterval(() => {
    const text = clipboard.readText();
    if (text && text !== lastClipboardText) {
      lastClipboardText = text;
      if ((text.includes('Error:') || text.includes('Exception')) && (text.includes('at ') || text.includes('Trace:'))) {
        if (Notification.isSupported()) new Notification({ title: 'AetheriaCompute', body: 'Error detected in clipboard. Analyzing...' }).show();
        if (mainWindow) mainWindow.webContents.send('clipboard-error', text);
      }
    }
  }, 1000);
}

// ─────────────────────────────────────────────
// MEMORY TRACKER
// ─────────────────────────────────────────────
let lastActiveWindow = null, altTabCount = 0, fatigueIntervalStart = Date.now();
function startMemoryTracker() {
  if (!activeWin) return;
  setInterval(async () => {
    try {
      const win = await activeWin();
      if (win && win.title !== lastActiveWindow) {
        lastActiveWindow = win.title;
        memoryDB.logEpisode(win.title, win.url || null, (win.owner && win.owner.name) || null);
        const now = Date.now();
        if (now - fatigueIntervalStart > 300000) { fatigueIntervalStart = now; altTabCount = 0; }
        if (++altTabCount > 30) {
          altTabCount = 0;
          if (Notification.isSupported()) new Notification({ title: 'Aetheria: Focus Alert', body: 'High context switching detected.' }).show();
        }
      }
    } catch(e) {}
  }, 10000);
}

// ─────────────────────────────────────────────
// APP LIFECYCLE
// ─────────────────────────────────────────────
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media' || permission === 'microphone');
  });
  createSplash();
  setTimeout(() => {
    createWindow();
    initializeWhatsApp();
    startVoiceEngine();
    startClipboardMonitor();
    memoryDB.init().then(() => startMemoryTracker()).catch(e => console.error('[MemoryDB] Init failed:', e));
  }, 200);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (voiceEngineProcess) voiceEngineProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

// ─────────────────────────────────────────────
// IPC HANDLERS
// ─────────────────────────────────────────────
ipcMain.handle('execute-command', async (event, command) => {
  return new Promise((resolve) => {
    let safeCommand = command;
    if (process.platform === 'win32' && safeCommand.toLowerCase().startsWith('open ')) {
      safeCommand = `start "" "${safeCommand.substring(5).trim()}"`;
    }
    exec(safeCommand, (error, stdout, stderr) => resolve(error ? { success: false, error: error.message, stderr: error.message, stdout: stdout || '' } : { success: true, stdout, stderr }));
  });
});

ipcMain.handle('execute-code-local', async (event, { code, language, files, activeFileId }) => {
  return new Promise((resolve) => {
    try {
      const runDir = path.join(app.getPath('temp'), `aetheria_run_${Date.now()}`)
      fs.mkdirSync(runDir, { recursive: true })

      let tmpPath = ''

      if (files && files.length > 0) {
        const buildTree = (nodes, currentPath) => {
          for (const node of nodes) {
            const nodePath = path.join(currentPath, node.name)
            if (node.type === 'folder') {
              if (!fs.existsSync(nodePath)) fs.mkdirSync(nodePath)
              if (node.children) buildTree(node.children, nodePath)
            } else {
              fs.writeFileSync(nodePath, node.content || '')
              if (node.id === activeFileId) tmpPath = nodePath
            }
          }
        }
        buildTree(files, runDir)
        if (!tmpPath) {
          const extMap = { python: 'py', javascript: 'js', typescript: 'ts', cpp: 'cpp', c: 'c', rust: 'rs', go: 'go', java: 'java', bash: 'sh' }
          const ext = extMap[language] || 'txt'
          tmpPath = path.join(runDir, `main.${ext}`)
          fs.writeFileSync(tmpPath, code)
        }
      } else {
        const extMap = { python: 'py', javascript: 'js', typescript: 'ts', cpp: 'cpp', c: 'c', rust: 'rs', go: 'go', java: 'java', bash: 'sh' }
        const ext = extMap[language] || 'txt'
        tmpPath = path.join(runDir, `main.${ext}`)
        fs.writeFileSync(tmpPath, code)
      }

      let cmd = ''
      if (language === 'python') cmd = `python "${tmpPath}"`
      else if (language === 'javascript') cmd = `node "${tmpPath}"`
      else if (language === 'typescript') cmd = `npx ts-node "${tmpPath}"`
      else if (language === 'bash') cmd = `bash "${tmpPath}"`
      else if (language === 'c') cmd = `gcc "${tmpPath}" -o "${tmpPath}.exe" && "${tmpPath}.exe"`
      else if (language === 'cpp') cmd = `g++ "${tmpPath}" -o "${tmpPath}.exe" && "${tmpPath}.exe"`
      else if (language === 'rust') cmd = `rustc "${tmpPath}" -o "${tmpPath}.exe" && "${tmpPath}.exe"`
      else if (language === 'go') cmd = `go run "${tmpPath}"`
      else if (language === 'java') cmd = `java "${tmpPath}"`
      
      if (!cmd) return resolve({ success: false, error: `Local execution not supported for ${language}` })

      exec(cmd, { cwd: runDir, timeout: 15000 }, (error, stdout, stderr) => {
        // Clean up the temp directory
        fs.rm(runDir, { recursive: true, force: true }, () => {})
        
        if (error) resolve({ success: false, error: error.message, stderr, stdout })
        else resolve({ success: true, stdout, stderr })
      })
    } catch(e) {
      resolve({ success: false, error: e.message })
    }
  })
});

ipcMain.handle('flow-state-active', async (event, data) => {
  if (Notification.isSupported()) new Notification({ title: 'Aetheria', body: 'Flow State detected. Focus mode on.' }).show();
});

ipcMain.handle('whatsapp-ready', async () => whatsappReady);
ipcMain.handle('whatsapp-get-qr', async () => currentWhatsappQr);

ipcMain.handle('whatsapp-get-contacts', async () => {
  if (!whatsappClient || !whatsappReady) return [];
  try {
    const all = await whatsappClient.getContacts();
    return all
      .filter(c => (c.name || c.pushname) && !c.isGroup)
      .map(c => ({
        id: c.id._serialized,
        name: c.name || c.pushname,
        number: c.number || c.id.user  // Use id.user as fallback — always a number
      }))
      .filter((v, i, a) => a.findIndex(v2 => v2.name === v.name) === i)  // deduplicate by name
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch(e) { console.error('[WA] getContacts failed:', e); return []; }
});

ipcMain.handle('whatsapp-send', async (event, { to, message }) => {
  try {
    let targetId = to;
    if (!/^\+?\d+$/.test(to.replace(/[-\s()]/g, ''))) {
      const s = to.toLowerCase();
      if (s.includes('myself') || s === 'me') { targetId = whatsappClient.info.wid._serialized; }
      else {
        const contacts = await whatsappClient.getContacts();
        const contact = contacts.find(c => (c.name || c.pushname || '').toLowerCase().includes(s));
        if (!contact) throw new Error(`Contact '${to}' not found.`);
        targetId = contact.id._serialized;
      }
    } else { targetId = to.replace(/[-\s()]/g, '') + '@c.us'; }
    await whatsappClient.sendMessage(targetId, message);
    updateLexicon(message);
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('whatsapp-get-recent-chats', async () => {
  if (!whatsappReady || !whatsappClient) return { success: false, error: 'Not connected' };
  try {
    const chats = await whatsappClient.getChats();
    const recent = chats.filter(c => !c.isGroup).slice(0, 30);  // Top 30 individual chats
    // Parallel fetch for MAXIMUM speed
    const results = await Promise.allSettled(
      recent.map(async (chat) => {
        const fetchPromise = chat.fetchMessages({ limit: 1 });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
        const msgs = await Promise.race([fetchPromise, timeoutPromise]);
        if (msgs.length === 0) return null;
        const lastMsg = msgs[msgs.length - 1];
        return {
          sender: chat.name || chat.id.user,
          body: lastMsg.body || (lastMsg.hasMedia ? '[Media]' : '[Message]'),
          timestamp: new Date(lastMsg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: chat.unreadCount || 0
        };
      })
    );
    const messages = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
    return { success: true, messages };
  } catch(e) { return { success: false, error: e.message }; }
});

ipcMain.handle('whatsapp-read', async (event, contactName) => {
  try {
    const chats = await whatsappClient.getChats();
    const chat = chats.find(c => c.name && c.name.toLowerCase().includes(contactName.toLowerCase()));
    if (!chat) return { success: false, error: `No chat found for "${contactName}".` };
    const msgs = await chat.fetchMessages({ limit: 10 });
    return { success: true, chatName: chat.name, messages: msgs.map(m => ({ sender: m.fromMe ? 'Me' : chat.name, body: m.body || (m.hasMedia ? '[Media]' : '[Empty]'), timestamp: new Date(m.timestamp * 1000).toLocaleString() })) };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('whatsapp-logout', async () => {
  try {
    if (whatsappClient) await whatsappClient.destroy();
    const authPath = path.join(app.getPath('userData'), '.wwebjs_auth');
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
    currentWhatsappQr = null; whatsappReady = false;
    initializeWhatsApp();
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('get-system-stats', async () => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  
  let totalIdle = 0, totalTick = 0;
  cpus.forEach(core => {
    for (const type in core.times) {
      totalTick += core.times[type];
    }
    totalIdle += core.times.idle;
  });
  
  const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);
  const memUsage = 100 - ~~(100 * freeMem / totalMem);
  
  return {
    cpu: cpuUsage,
    memory: memUsage,
    freemem: (freeMem / 1024 / 1024 / 1024).toFixed(2),
    totalmem: (totalMem / 1024 / 1024 / 1024).toFixed(2)
  };
});

ipcMain.handle('media-control', async (event, action) => {
  if (process.platform !== 'win32') return { success: false, error: 'Media controls only supported on Windows.' };
  
  const keys = {
    'playpause': 179,
    'next': 176,
    'prev': 177,
    'volup': 175,
    'voldown': 174,
    'mute': 173
  };
  
  const keyCode = keys[action];
  if (!keyCode) return { success: false, error: 'Invalid media action.' };
  
  return new Promise((resolve) => {
    exec(`powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys([char]${keyCode})"`, (err) => {
      resolve({ success: !err });
    });
  });
});

ipcMain.handle('get-os-context', async () => {
  return new Promise((resolve) => {
    const ctx = { platform: os.platform(), username: os.userInfo().username, hostname: os.hostname(), runningApps: [] };
    if (process.platform === 'win32') {
      exec('powershell -command "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object -ExpandProperty MainWindowTitle"', (err, stdout) => {
        if (!err && stdout) ctx.runningApps = stdout.split('\n').map(s => s.trim()).filter(Boolean);
        resolve(ctx);
      });
    } else { resolve(ctx); }
  });
});

ipcMain.handle('suspend-process', async (event, processName) => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve({ success: false, error: 'Windows only' });
    const pssuspendPath = path.join(__dirname, 'bin', 'pssuspend.exe');
    if (!fs.existsSync(pssuspendPath)) return resolve({ success: false, error: 'pssuspend.exe not found. See README.md for download instructions.' });
    exec(`"${pssuspendPath}" -accepteula ${processName}`, (err, stdout) => resolve(err ? { success: false, error: err.message } : { success: true, stdout }));
  });
});

ipcMain.handle('ghost-type', async (event, text) => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve({ success: false, error: 'Windows only' });
    const safeText = text.replace(/'/g, "''");
    const psScript = `Add-Type -AssemblyName System.Windows.Forms;$str='${safeText}';foreach($c in $str.ToCharArray()){$e=$c.ToString();if($e -match '[+^%~(){}\\[\\]]'){$e="{$e}"}[System.Windows.Forms.SendKeys]::SendWait($e);Start-Sleep -Milliseconds (Get-Random -Minimum 10 -Maximum 40)}`;
    exec(`powershell -command "${psScript}"`);
    resolve({ success: true });
  });
});
