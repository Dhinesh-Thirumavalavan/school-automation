import express from 'express';
import { translateText } from '../services/groq.service';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    const tamilText = await translateText(text);
    res.json({ tamilText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

export default router;
