import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { transcribeAudio } from '../services/groq.service';

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 16 * 1024 * 1024 } });

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
    const ext = req.file.originalname.split('.').pop() || 'mp3';
    const newPath = `${req.file.path}.${ext}`;
    fs.renameSync(req.file.path, newPath);
    const transcription = await transcribeAudio(newPath);
    fs.unlinkSync(newPath);
    res.json({ text: transcription.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

export default router;
