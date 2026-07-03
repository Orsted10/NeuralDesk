const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { Client, LocalAuth } = require('whatsapp-web.js');

let mainWindow;
let whatsappClient;

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
      mainWindow.webContents.send('whatsapp-ready');
    }
  });

  whatsappClient.on('message', message => {
    console.log(`Received WhatsApp message from ${message.from}: ${message.body}`);
    // Forward incoming message to the JARVIS frontend
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

app.whenReady().then(() => {
  createWindow();
  initializeWhatsApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for JARVIS capabilities

ipcMain.handle('execute-command', async (event, command) => {
  return new Promise((resolve, reject) => {
    console.log(`Executing OS command: ${command}`);
    exec(command, (error, stdout, stderr) => {
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
    // Format the number correctly for whatsapp-web.js (e.g. 1234567890@c.us)
    const formattedNumber = to.includes('@c.us') ? to : `${to.replace(/\D/g, '')}@c.us`;
    await whatsappClient.sendMessage(formattedNumber, message);
    return { success: true };
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return { success: false, error: error.message };
  }
});
