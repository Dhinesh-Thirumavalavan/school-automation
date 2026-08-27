import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { MessageMedia } from 'whatsapp-web.js';
import { supabase } from '../services/supabase.service';
import { translateText } from '../services/groq.service';
import { logMessage } from '../services/logMessage.service';
import { sendToPhone, waClient, waReady } from '../services/whatsapp.service';

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 16 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('students').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/search', async (req, res) => {
  const q = (req.query.q as string) || '';
  const { data, error } = await supabase.from('students').select('*').or(`name.ilike.%${q}%,class.ilike.%${q}%`).limit(10);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id/fees', async (req, res) => {
  const { data, error } = await supabase.from('fee_records').select('*').eq('student_id', req.params.id).neq('status', 'paid');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, class: studentClass, section, roll_no, parent_phone, parent_name, alternate_phone, gender, address, blood_group, admission_date, birthday } = req.body;
  const { data, error } = await supabase.from('students').insert([{ name, class: studentClass, section, roll_no, parent_phone, parent_name, alternate_phone, gender, address, blood_group, admission_date, birthday }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.put('/:id', async (req, res) => {
  const { name, class: studentClass, section, roll_no, parent_phone, parent_name, alternate_phone, gender, address, blood_group, admission_date, birthday } = req.body;
  const { data, error } = await supabase.from('students').update({ name, class: studentClass, section, roll_no, parent_phone, parent_name, alternate_phone, gender, address, blood_group, admission_date, birthday }).eq('id', req.params.id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo provided' });
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${req.params.id}-${Date.now()}.${fileExt}`;
    const fileData = fs.readFileSync(req.file.path);
    const { error: uploadError } = await supabase.storage.from('student-photos').upload(fileName, fileData, { contentType: req.file.mimetype, upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('student-photos').getPublicUrl(fileName);
    await supabase.from('students').update({ photo_url: publicUrlData.publicUrl }).eq('id', req.params.id);
    fs.unlinkSync(req.file.path);
    res.json({ photo_url: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/send-birthday', async (req, res) => {
  try {
    if (!waReady) return res.status(503).json({ error: 'WhatsApp not ready yet, please try again in a few seconds' });
    const { data: student } = await supabase.from('students').select('*').eq('id', req.params.id).single();
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const english = `Today's birthday: ${student.name}! God bless you, have a fantastic year ahead.`;
    const tamil = await translateText(english);
    const fullMessage = `${english}\n\n${tamil}`;
    const cleanPhone = student.parent_phone.replace(/[^0-9]/g, '');
    const numberId = await waClient.getNumberId(cleanPhone);
    if (numberId) {
      if (student.photo_url) await waClient.sendMessage(numberId._serialized, await MessageMedia.fromUrl(student.photo_url), { caption: fullMessage });
      else await waClient.sendMessage(numberId._serialized, fullMessage);
    } else return res.status(400).json({ error: 'Invalid WhatsApp number' });
    await logMessage(english, tamil, `Birthday — ${student.name}`, 1);
    res.json({ success: true });
  } catch (err: any) {
    console.error('send-birthday error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk import — fixed path (was incorrectly duplicated as /api/students/api/students/bulk-import)
router.post('/bulk-import', async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No student data provided' });
    }

    const { data, error } = await supabase.from('students').insert(students).select();
    if (error) throw error;

    res.json({ success: true, imported: data.length });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('students').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;