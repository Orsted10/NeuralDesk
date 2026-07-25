# AetheriaCompute Desktop App

The native desktop client for AetheriaCompute. Powers WhatsApp automation, Voice-to-UPI payments, OS commands, memory tracking, and more.

---

## Prerequisites

Before running, make sure you have these installed:

1. **Node.js** (v18 or newer) — Download from https://nodejs.org
2. **Python 3.10+** — Download from https://python.org (needed for voice engine in dev mode)
3. **Google Chrome or Microsoft Edge** — Must be installed on the PC (for WhatsApp Web)

---

## Step 1: Install Dependencies

Open a terminal (Command Prompt or PowerShell) and `cd` into this folder:

```bash
cd e:\Aetheria\desktop-app
npm install
```

This installs all required packages (Electron, WhatsApp Web.js, SQLite3, etc.). It may take 2-5 minutes.

---

## Step 2: Download pssuspend.exe (Optional — for RAM Freezing feature)

The RAM Process Freezing feature requires `pssuspend.exe` from Microsoft Sysinternals.

1. Go to: https://learn.microsoft.com/en-us/sysinternals/downloads/pssuspend
2. Click **Download PsSuspend**. It will download a ZIP file.
3. Extract the ZIP and copy `pssuspend.exe` into the `bin/` folder:
   ```
   e:\Aetheria\desktop-app\bin\pssuspend.exe
   ```
4. Create the `bin/` folder if it doesn't exist.

---

## Step 3: Run in Development Mode

```bash
npm run start:dev
```

This opens Aetheria pointing to **http://localhost:3000** (your local Next.js dev server).

Make sure your Next.js server is running (`npm run dev` in `e:\Aetheria`).

---

## Step 4: Run in Production Mode (points to aetheriacompute.me)

```bash
npm start
```

This opens Aetheria and loads **https://aetheriacompute.me** directly. No local server needed.

---

## Step 5: Connect WhatsApp

1. When the app opens, Aetheria will automatically start initializing WhatsApp in the background.
2. A QR code will appear on the screen (inside the Aetheria UI).
3. Open WhatsApp on your phone → **Tap the three dots (⋮)** → **Linked Devices** → **Link a Device**.
4. Scan the QR code with your phone.
5. WhatsApp is now connected. Aetheria can now send/read messages, send UPI payment links, etc.

> **Note:** Your WhatsApp session is saved locally. You only need to scan once.

---

## Step 6: Voice-to-UPI Payments

Once WhatsApp is connected:

1. Press the microphone button in Aetheria and say: *"Pay Rishi 300 rupees for lunch"*
2. Aetheria will:
   - Search your WhatsApp contacts for "Rishi"
   - Build a `upi://pay` deep link
   - Send a WhatsApp message to Rishi with the payment link
3. Rishi taps the link → Opens Google Pay / PhonePe / Paytm with amount pre-filled
4. **If amount ≤ ₹500 and UPI Lite is enabled** → Zero PIN, instant transfer!

---

## Step 7: Build the Windows Installer (.exe)

When you are ready to distribute to other users:

```bash
npm run build
```

The installer `.exe` file will appear in `release/`. Share this file with anyone — they can install it with one click, no Node.js needed.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| WhatsApp QR code not appearing | Wait 30-60 seconds, the WhatsApp Web headless browser takes time to start |
| `sqlite3` build error | Run `npm install --ignore-scripts` then `npx electron-rebuild` |
| App crashes on launch | Make sure Node.js v18+ is installed |
| Voice engine not starting | Make sure Python is installed and in PATH |
| Contact not found for UPI payment | Make sure the name matches exactly as it appears in your WhatsApp contacts |

---

## File Structure

```
desktop-app/
├── main.js          — Main Electron process (WhatsApp, OS, UPI, Memory)
├── preload.js       — Bridge between Electron and the web app
├── memory_db.js     — Local SQLite database for episodic memory
├── voice_engine.py  — Python voice recognition engine
├── bin/
│   ├── pssuspend.exe  — (Download separately, see Step 2)
│   └── voice_engine.exe  — (Auto-generated on build)
├── build/
│   └── icon.ico     — App icon (copy your Aetheria icon here)
├── release/         — Built installer output
└── package.json
```
