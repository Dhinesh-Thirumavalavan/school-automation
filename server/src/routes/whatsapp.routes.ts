import express from 'express';
import { sendToPhone } from '../services/whatsapp.service';
import { logMessage } from '../services/logMessage.service';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { phones, message, audience } = req.body;
    const failed: string[] = [];

    for (const phone of phones) {
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        failed.push(phone);
        continue;
      }
      try {
        await sendToPhone(cleanPhone, message);
      } catch (err) {
        failed.push(phone);
      }
    }

    const [englishPart, tamilPart] = message.split('\n\n');
    await logMessage(englishPart, tamilPart || '', audience || 'Custom', phones.length, failed);

    res.json({ success: true, sentCount: phones.length - failed.length, failedCount: failed.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send WhatsApp messages' });
  }
});

export default router;