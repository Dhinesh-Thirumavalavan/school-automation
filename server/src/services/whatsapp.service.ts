import fs from 'fs';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

export let waReady = false;
export let currentQR: string | null = null;
export let captureMode = false;
export let capturedGroups: { id: string; name: string }[] = [];

const sessionPath = '/app/.wwebjs_auth';
try {
  const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
  const findAndRemoveLocks = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`;
      if (entry.isDirectory()) findAndRemoveLocks(fullPath);
      else if (lockFiles.includes(entry.name)) {
        fs.unlinkSync(fullPath);
        console.log(`Removed stale lock file: ${fullPath}`);
      }
    }
  };
  findAndRemoveLocks(sessionPath);
} catch (err) {
  console.log('Lock cleanup skipped (non-fatal):', err);
}

export const waClient = new Client({
  authStrategy: new LocalAuth({ dataPath: '/app/.wwebjs_auth' }),
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 120000,
  },
});

waClient.on('qr', (qr) => {
  currentQR = qr;
  qrcode.generate(qr, { small: true });
  console.log('QR code received - visit /qr to scan it as an image');
});
waClient.on('ready', () => {
  waReady = true;
  currentQR = null;
  console.log('✅ WhatsApp client is ready!');
});
waClient.on('disconnected', () => {
  waReady = false;
  console.log('⚠️ WhatsApp client disconnected');
});

// Passively capture group chat IDs when a message arrives, while capture mode is on
// (workaround for the currently-broken getChats() bug in whatsapp-web.js)
waClient.on('message', async (msg) => {
  if (!captureMode) return;
  try {
    const chat = await msg.getChat();
    if (chat.isGroup) {
      const alreadyCaptured = capturedGroups.some((g) => g.id === chat.id._serialized);
      if (!alreadyCaptured) {
        capturedGroups.push({ id: chat.id._serialized, name: chat.name });
        console.log(`Captured group: ${chat.name} (${chat.id._serialized})`);
      }
    }
  } catch (err) {
    console.error('Error capturing group from message event:', err);
  }
});

export function startCapture() {
  captureMode = true;
  capturedGroups = [];
}

export function stopCapture() {
  captureMode = false;
}

export function getCapturedGroups() {
  return capturedGroups;
}

export async function sendToPhone(phone: string, message: string) {
  if (!waReady) {
    console.log('⚠️ WhatsApp not ready yet, skipping send to', phone);
    return;
  }
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  try {
    const numberId = await waClient.getNumberId(cleanPhone);
    if (!numberId) {
      console.log(`⚠️ ${cleanPhone} is not a valid WhatsApp number`);
      return;
    }
    await waClient.sendMessage(numberId._serialized, message);
  } catch (err) {
    console.error(`Failed to send to ${cleanPhone}:`, err);
  }
}

export async function sendToGroup(groupChatId: string, message: string) {
  if (!waReady) {
    console.log('⚠️ WhatsApp not ready yet, skipping group send to', groupChatId);
    return;
  }
  try {
    await waClient.sendMessage(groupChatId, message);
  } catch (err) {
    console.error(`Failed to send to group ${groupChatId}:`, err);
  }
}

export function initializeWhatsApp() {
  return waClient.initialize();
}