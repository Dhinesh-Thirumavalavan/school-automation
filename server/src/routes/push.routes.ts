import express from 'express';
import { saveSubscription, removeSubscription } from '../services/push.service';

const router = express.Router();

router.post('/subscribe', (req, res) => {
  try {
    const { phone, subscription } = req.body;
    if (!phone || !subscription?.endpoint) return res.status(400).json({ error: 'phone and subscription are required' });
    saveSubscription(phone, subscription);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/unsubscribe', (req, res) => {
  try {
    const { phone, endpoint } = req.body;
    if (!phone || !endpoint) return res.status(400).json({ error: 'phone and endpoint are required' });
    removeSubscription(phone, endpoint);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
