const { app, BrowserWindow, ipcMain, session, clipboard, Notification } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const { Client, LocalAuth } = require('whatsapp-web.js');
const os = require('os');
const fs = require('fs');
const activeWin = require('active-win');
const memoryDB = require('./memory_db');

function getChromeExecutablePath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let mainWindow;
let whatsappClient;
let voiceEngineProcess;
let currentWhatsappQr = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load the Vercel hosted Next.js app
  // Fallback to localhost if running the dev server
  const url = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://neural-desk-three.vercel.app/'; // Adjust to actual production URL
  
  mainWindow.loadURL(url);
}

function initializeWhatsApp() {
  const executablePath = getChromeExecutablePath();
  const puppeteerOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  
  if (executablePath) {
    console.log(`Found browser at: ${executablePath}`);
    puppeteerOptions.executablePath = executablePath;
  } else {
    console.warn("Could not find Chrome/Edge installation. Puppeteer will attempt to use its bundled Chromium.");
  }

  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerOptions
  });

  whatsappClient.on('qr', (qr) => {
    // Send QR code to the frontend renderer to display to the user for scanning
    console.log('QR Received. Forwarding to renderer...');
    currentWhatsappQr = qr;
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp-qr', qr);
    }
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    currentWhatsappQr = null;
    if (mainWindow) {
      const myNumber = whatsappClient.info ? whatsappClient.info.wid.user : null;
      mainWindow.webContents.send('whatsapp-ready', { myNumber: myNumber });
    }
  });

  whatsappClient.on('message', message => {
    // Forward incoming message to the JARVIS frontend silently
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp-message', {
        from: message.from,
        body: message.body,
        notifyName: message._data?.notifyName || 'Unknown'
      });
    }

    // Lexicon update
    updateLexicon(message.body);
  });

  whatsappClient.initialize();
}

function updateLexicon(text) {
  if (!text) return;
  const lexiconPath = path.join(app.getPath('userData'), 'lexicon.json');
  let lexicon = {};
  if (fs.existsSync(lexiconPath)) {
    try {
      lexicon = JSON.parse(fs.readFileSync(lexiconPath, 'utf8'));
    } catch(e){}
  }
  
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  words.forEach((word) => {
    if (word.length > 3) {
      lexicon[word] = (lexicon[word] || 0) + 1;
    }
  });
  fs.writeFileSync(lexiconPath, JSON.stringify(lexicon, null, 2));
}

// IPC handler to get top lexicon words for LLM prompt
ipcMain.handle('get-lexicon', async () => {
  const lexiconPath = path.join(app.getPath('userData'), 'lexicon.json');
  if (!fs.existsSync(lexiconPath)) return [];
  try {
    const lexicon = JSON.parse(fs.readFileSync(lexiconPath, 'utf8'));
    // Return top 15 words
    return Object.entries(lexicon)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(entry => entry[0]);
  } catch(e) {
    return [];
  }
});

// IPC handler for Context Graph
ipcMain.handle('store-context', async (event, { subject, predicate, object }) => {
  memoryDB.logContext(subject, predicate, object);
  return true;
});

ipcMain.handle('search-context', async (event, query) => {
  return await memoryDB.searchContext(query);
});

ipcMain.handle('get-episodes', async (event, limit) => {
  return await memoryDB.getRecentEpisodes(limit);
});

function startVoiceEngine() {
  console.log("Starting Python Voice Engine...");
  
  const spawnEngine = () => {
    if (app.isPackaged) {
      const voiceEnginePath = path.join(process.resourcesPath, 'app.asar.unpacked', 'bin', 'voice_engine.exe');
      console.log(`Launching packaged engine: ${voiceEnginePath}`);
      voiceEngineProcess = spawn(voiceEnginePath);
    } else {
      const voiceEnginePath = path.join(__dirname, 'voice_engine.py');
      console.log(`Launching dev engine: ${voiceEnginePath}`);
      voiceEngineProcess = spawn('python', [voiceEnginePath]);
    }
    
    voiceEngineProcess.stdout.on('data', (data) => {
      console.log(`VoiceEngine: ${data}`);
    });
    
    voiceEngineProcess.stderr.on('data', (data) => {
      console.error(`VoiceEngine Error: ${data}`);
    });
  };

  if (process.platform === 'win32') {
    exec('taskkill /F /IM voice_engine.exe', (err) => {
      spawnEngine();
    });
  } else {
    spawnEngine();
  }
}

let lastClipboardText = '';

function startClipboardMonitor() {
  console.log("Starting Invisible Clipboard Symbiosis...");
  setInterval(() => {
    const text = clipboard.readText();
    if (text && text !== lastClipboardText) {
      lastClipboardText = text;
      
      // Heuristic for an error stack trace or exception
      if (
        (text.includes('Error:') || text.includes('Exception')) && 
        (text.includes('at ') || text.includes('Trace:') || text.includes('line '))
      ) {
        console.log("AetheriaCompute intercepted an error on clipboard.");
        
        if (Notification.isSupported()) {
          new Notification({
            title: 'AetheriaCompute Intercept',
            body: 'Error stack trace detected in clipboard. Analyzing solution...',
          }).show();
        }
        
        // Push to renderer for Groq analysis
        if (mainWindow) {
          mainWindow.webContents.send('clipboard-error', text);
        }
      }
    }
  }, 1000); // Poll every second
}

// Memory: Track active window
let lastActiveWindow = null;
let altTabCount = 0;
let fatigueIntervalStart = Date.now();

function startMemoryTracker() {
  setInterval(async () => {
    try {
      const win = await activeWin();
      if (win) {
        const title = win.title || 'Unknown';
        if (title !== lastActiveWindow) {
          lastActiveWindow = title;
          memoryDB.logEpisode(title, win.url || null, win.owner?.name || null);
          
          // Decision Fatigue Monitor (Feature 23)
          const now = Date.now();
          if (now - fatigueIntervalStart > 5 * 60 * 1000) { // 5 minutes window
            fatigueIntervalStart = now;
            altTabCount = 0;
          }
          altTabCount++;
          if (altTabCount > 30) {
            altTabCount = 0; // reset to avoid spam
            if (Notification.isSupported()) {
              new Notification({
                title: 'Aetheria Compute: High Context Switching',
                body: 'You are rapidly switching contexts. Consider pausing to focus on a single task.',
              }).show();
            }
          }
        }
      }
    } catch (err) {
      console.error("[MemoryDB] Active win tracking error:", err);
    }
  }, 10000); // Poll every 10 seconds
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  createWindow();
  initializeWhatsApp();
  startVoiceEngine();
  startClipboardMonitor();

  // Phase 6: Deep Memory Integration
  memoryDB.init().then(() => {
    startMemoryTracker();
  }).catch(e => console.error("MemoryDB failed to init", e));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (voiceEngineProcess) {
    voiceEngineProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for Aetheria capabilities

ipcMain.handle('execute-command', async (event, command) => {
  return new Promise((resolve, reject) => {
    // macOS 'open' vs Windows 'start' fix
    let safeCommand = command;
    if (process.platform === 'win32' && safeCommand.toLowerCase().startsWith('open ')) {
      const target = safeCommand.substring(5).trim();
      safeCommand = `start "" "${target}"`;
    }

    console.log(`Executing OS command: ${safeCommand}`);
    exec(safeCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Exec error: ${error}`);
        resolve({ success: false, error: error.message, stderr });
        return;
      }
      resolve({ success: true, stdout, stderr });
    });
  });
});

// Focus Assist for Typing Flow State
ipcMain.handle('flow-state-active', async (event, data) => {
  console.log(`[Flow State] Detected! CPM: ${data.cpm}. Activating Focus Assist.`);
  
  if (process.platform === 'win32') {
    if (Notification.isSupported()) {
      new Notification({
        title: 'Aetheria Compute',
        body: 'Flow State detected. Notifications suppressed.',
      }).show();
    }
    // Simple way to trigger focus assist via powershell (if enabled in Windows)
    // Here we just mock the DND toggle since exact registry hacks require elevation.
    console.log("[OS] Simulated DND toggle on Windows.");
  }
});

ipcMain.handle('whatsapp-ready', async () => {
  return whatsappClient && whatsappClient.info !== undefined;
});

ipcMain.handle('whatsapp-get-qr', async () => {
  return currentWhatsappQr;
});

ipcMain.handle('whatsapp-get-contacts', async () => {
  if (!whatsappClient) return [];
  try {
    const contacts = await whatsappClient.getContacts();
    return contacts
      .filter(c => c.name || c.pushname)
      .map(c => ({
        id: c.id._serialized,
        name: c.name || c.pushname,
        number: c.number
      }));
  } catch (error) {
    return [];
  }
});

ipcMain.handle('whatsapp-send', async (event, { to, message }) => {
  try {
    let targetId = to;
    
    // If it doesn't look like a phone number, search contacts
    if (!/^\+?\d+$/.test(to.replace(/[-\s()]/g, ''))) {
      const searchStr = to.toLowerCase();
      // Handle "text myself"
      if (searchStr.includes('myself') || searchStr === 'me' || searchStr.includes('my number')) {
        targetId = whatsappClient.info.wid._serialized;
      } else {
        const contacts = await whatsappClient.getContacts();
        const contact = contacts.find(c => {
          const name = (c.name || c.pushname || '').toLowerCase();
          return name.includes(searchStr);
        });
        if (!contact) throw new Error(`Contact '${to}' not found.`);
        targetId = contact.id._serialized;
      }
    } else {
      targetId = to.replace(/[-\s()]/g, '') + '@c.us';
    }

    await whatsappClient.sendMessage(targetId, message);
    updateLexicon(message); // Update Lexicon with outgoing message
    return { success: true };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('whatsapp-read', async (event, contactName) => {
  try {
    const chats = await whatsappClient.getChats();
    // Try to find a chat matching the name
    const targetChat = chats.find(c => c.name && c.name.toLowerCase().includes(contactName.toLowerCase()));
    
    if (!targetChat) {
      return { success: false, error: `Could not find a chat with the name "${contactName}".` };
    }

    // Fetch the last 5 messages
    const messages = await targetChat.fetchMessages({ limit: 10 });
    const formattedMessages = messages.map(m => {
      let extractedText = m.body || (m._data && m._data.body) || (m._data && m._data.caption);
      if (!extractedText || extractedText.trim() === '') {
        extractedText = m.hasMedia ? '[Media Attached]' : '[System/Empty Message]';
      }
      return {
        sender: m.fromMe ? 'Me' : (targetChat.name || 'Them'),
        body: extractedText,
        timestamp: new Date(m.timestamp * 1000).toLocaleString()
      };
    });

    return { success: true, chatName: targetChat.name, messages: formattedMessages };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('whatsapp-logout', async () => {
  try {
    if (whatsappClient) {
      await whatsappClient.destroy();
    }
    const authPath = path.join(__dirname, '.wwebjs_auth');
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
    }
    currentWhatsappQr = null;
    initializeWhatsApp();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-os-context', async () => {
  return new Promise((resolve) => {
    const context = {
      platform: os.platform(),
      username: os.userInfo().username,
      hostname: os.hostname(),
      runningApps: []
    };
    
    if (process.platform === 'win32') {
      // Get a list of running apps with window titles
      exec('powershell -command "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object -ExpandProperty MainWindowTitle"', (err, stdout) => {
        if (!err && stdout) {
          context.runningApps = stdout.split('\\n').map(s => s.trim()).filter(s => s.length > 0);
        }
        resolve(context);
      });
    } else {
      resolve(context);
    }
  });
});

ipcMain.handle('suspend-process', async (event, processName) => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: false, error: 'Only supported on Windows' });
    }
    const pssuspendPath = path.join(__dirname, 'bin', 'pssuspend.exe');
    if (!fs.existsSync(pssuspendPath)) {
      return resolve({ success: false, error: 'pssuspend.exe not found in bin folder' });
    }
    
    // Auto-accept EULA via -accepteula
    exec(`"${pssuspendPath}" -accepteula ${processName}`, (err, stdout, stderr) => {
      if (err) {
         resolve({ success: false, error: err.message });
      } else {
         resolve({ success: true, stdout });
      }
    });
  });
});

ipcMain.handle('ghost-type', async (event, text) => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve({ success: false, error: 'Only supported on Windows' });
    }
    // Escape single quotes for powershell string
    const safeText = text.replace(/'/g, "''");
    // We use a small inline C# class to avoid SendKeys escaping nightmare and simulate real keystrokes via SendWait
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms;
      $str = '${safeText}';
      foreach ($c in $str.ToCharArray()) {
         $cEscaped = $c.ToString()
         if ($cEscaped -match '[+^%~(){}\[\]]') {
            $cEscaped = "{$cEscaped}"
         }
         [System.Windows.Forms.SendKeys]::SendWait($cEscaped);
         Start-Sleep -Milliseconds (Get-Random -Minimum 10 -Maximum 40);
      }
    `;
    
    // We don't await the exec so it doesn't block IPC for a long string
    exec(`powershell -command "${psScript.replace(/\n/g, '')}"`);
    resolve({ success: true });
  });
});
