import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { MessageMedia } from 'whatsapp-web.js';
import { waClient, waReady, sendToPhone } from '../services/whatsapp.service';
import { logMessage } from '../services/logMessage.service';

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 16 * 1024 * 1024 } });

router.post('/', async (req, res) => {
  try {
    const { phones, message, audience } = req.body;
    const results = [];
    for (const phone of phones) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      try {
        await sendToPhone(cleanPhone, message);
        results.push({ phone: cleanPhone, status: 'sent' });
      } catch (err) {
        results.push({ phone: cleanPhone, status: 'failed' });
      }
    }
    const [englishPart, tamilPart] = message.split('\n\n');
    await logMessage(englishPart, tamilPart || '', audience || 'Custom', phones.length);
    res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send WhatsApp messages' });
  }
});

router.post('/media', upload.array('media', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No media files provided' });
    const { phones, caption, audience } = req.body;
    const phoneList = JSON.parse(phones);
    const mediaObjects = files.map((file) => {
      const fileData = fs.readFileSync(file.path);
      return new MessageMedia(file.mimetype, fileData.toString('base64'), file.originalname);
    });
    for (const phone of phoneList) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (!waReady) continue;
      const numberId = await waClient.getNumberId(cleanPhone);
      if (!numberId) continue;
      for (let i = 0; i < mediaObjects.length; i++) {
        await waClient.sendMessage(numberId._serialized, mediaObjects[i], i === 0 ? { caption } : {});
      }
    }
    files.forEach((file) => fs.unlinkSync(file.path));
    await logMessage(caption || `[${files.length} media files]`, '', audience || 'Custom', phoneList.length);
    res.json({ success: true, count: files.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send media' });
  }
});

export default router;
