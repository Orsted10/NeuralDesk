const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const { Client, LocalAuth } = require('whatsapp-web.js');
const os = require('os');

let mainWindow;
let whatsappClient;
let voiceEngineProcess;

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
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  whatsappClient.on('qr', (qr) => {
    // Send QR code to the frontend renderer to display to the user for scanning
    console.log('QR Received. Forwarding to renderer...');
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp-qr', qr);
    }
  });

  whatsappClient.on('ready', () => {
    console.log('WhatsApp Client is ready!');
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
  });

  whatsappClient.initialize();
}

function startVoiceEngine() {
  console.log("Starting Python Voice Engine...");
  
  const voiceEnginePath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'voice_engine.py')
    : path.join(__dirname, 'voice_engine.py');

  // Assuming python is in PATH
  voiceEngineProcess = spawn('python', [voiceEnginePath]);
  
  voiceEngineProcess.stdout.on('data', (data) => {
    console.log(`VoiceEngine: ${data}`);
  });
  
  voiceEngineProcess.stderr.on('data', (data) => {
    console.error(`VoiceEngine Error: ${data}`);
  });
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

// IPC Handlers for JARVIS capabilities

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

ipcMain.handle('whatsapp-ready', async () => {
  return whatsappClient && whatsappClient.info !== undefined;
});

ipcMain.handle('whatsapp-send', async (event, { to, message }) => {
  try {
    let targetId = to;
    
    // If it doesn't look like a phone number, search contacts
    if (!/^\+?\d+$/.test(to.replace(/[-\s()]/g, ''))) {
      const chats = await whatsappClient.getChats();
      const targetChat = chats.find(c => c.name && c.name.toLowerCase().includes(to.toLowerCase()));
      if (!targetChat) {
        return { success: false, error: `Could not find a contact named "${to}".` };
      }
      targetId = targetChat.id._serialized;
    } else {
      targetId = to.includes('@c.us') ? to : `${to.replace(/\D/g, '')}@c.us`;
    }
    
    await whatsappClient.sendMessage(targetId, message);
    return { success: true };
  } catch (error) {
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
